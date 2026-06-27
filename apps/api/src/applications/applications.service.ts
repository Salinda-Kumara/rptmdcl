import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateApplicationDto, SubmitApplicationDto, ReviewActionDto, PaymentReviewDto } from './dtos/application.dto';

// Fee structure in LKR (whole rupees, as per the physical form)
// Medical (re-sit on medical ground): LKR 5,200 per subject
// Repeat / Re-Repeat: LKR 2,600 per subject
const MEDICAL_FEE_PER_SUBJECT = 5200;
const REPEAT_FEE_PER_SUBJECT = 2600;

// Documents that must be attached before an application can be submitted.
// Repeat → payment slip. Medical → payment slip + medical certificate.
export const REQUIRED_DOCUMENTS: Record<string, string[]> = {
  REPEAT: ['PAYMENT_SLIP'],
  MEDICAL: ['PAYMENT_SLIP', 'MEDICAL_CERTIFICATE'],
};

const DOC_LABELS: Record<string, string> = {
  PAYMENT_SLIP: 'Payment slip',
  MEDICAL_CERTIFICATE: 'Medical certificate',
  SUPPORTING_DOCUMENT: 'Supporting document',
};

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateApplicationDto) {
    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) throw new NotFoundException('Student not found');

    if (dto.subjects.length === 0) {
      throw new BadRequestException('At least one subject is required');
    }

    const feePerSubject = dto.type === 'REPEAT' ? REPEAT_FEE_PER_SUBJECT : MEDICAL_FEE_PER_SUBJECT;
    const totalFee = dto.subjects.length * feePerSubject;

    // Snapshot the applicant's details onto THIS application. Every field is
    // editable for the application and falls back to the student record when not
    // provided. The Student master record is never modified here.
    const a = dto.applicant ?? {};
    const applicantDetails = {
      registrationNumber: a.registrationNumber ?? student.registrationNumber,
      nic: a.nic ?? student.nic,
      batchNumber: a.batchNumber ?? student.batchNumber,
      intake: a.intake ?? student.intake,
      fullName: a.fullName ?? student.fullName,
      nameWithInitials: a.nameWithInitials ?? student.nameWithInitials ?? '',
      permanentAddress: a.permanentAddress ?? student.permanentAddress,
      postalAddress: a.postalAddress ?? student.postalAddress ?? '',
      telephone: a.telephone ?? student.telephone ?? '',
      mobile: a.mobile ?? student.mobile,
      email: a.email ?? student.email,
    };

    const application = await this.prisma.application.create({
      data: {
        type: dto.type,
        status: 'DRAFT',
        studentId: student.id,
        totalFee,
        applicantDetails,
        applicationSubjects: {
          create: dto.subjects.map((s) => ({
            subjectId: s.subjectId,
            category: s.category,
            caMarks: s.caMarks,
            upcomingExamIntake: s.upcomingExamIntake,
            upcomingExamDate: s.upcomingExamDate ? new Date(s.upcomingExamDate) : undefined,
            previousExamDate: s.previousExamDate ? new Date(s.previousExamDate) : undefined,
            previousExamIntake: s.previousExamIntake,
            gradeEarned: s.gradeEarned,
          })),
        },
      },
      include: {
        applicationSubjects: { include: { subject: true } },
      },
    });

    return application;
  }

  async findAll(userId: string) {
    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) throw new NotFoundException('Student not found');

    return this.prisma.application.findMany({
      where: { studentId: student.id, deletedAt: null },
      include: {
        applicationSubjects: { include: { subject: true } },
        payment: true,
        approvals: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) throw new NotFoundException('Student not found');

    const application = await this.prisma.application.findFirst({
      where: { id, studentId: student.id, deletedAt: null },
      include: {
        applicationSubjects: { include: { subject: true } },
        payment: true,
        approvals: true,
        remarks: { include: { user: { select: { email: true, staffUser: true } } } },
        documents: true,
      },
    });

    if (!application) throw new NotFoundException('Application not found');
    return application;
  }

  /** Generate a daily serial number: YYYYMMDD-NN (resets at midnight each day). */
  private async generateSerialNumber(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}${m}${d}`;

    const startOfDay = new Date(y, now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay   = new Date(y, now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const count = await this.prisma.application.count({
      where: {
        serialNumber: { startsWith: dateStr },
        deletedAt: null,
      },
    });

    const seq = String(count + 1).padStart(2, '0');
    return `${dateStr}-${seq}`;
  }

  async submit(userId: string, id: string, dto: SubmitApplicationDto) {
    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) throw new NotFoundException('Student not found');

    const application = await this.prisma.application.findFirst({
      where: { id, studentId: student.id, deletedAt: null },
    });

    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT applications can be submitted');
    }

    // Enforce mandatory attachments before submission.
    const required = REQUIRED_DOCUMENTS[application.type] ?? [];
    if (required.length > 0) {
      const docs = await this.prisma.document.findMany({
        where: { applicationId: id, deletedAt: null },
        select: { documentType: true },
      });
      const present = new Set(docs.map((d) => d.documentType));
      const missing = required.filter((type) => !present.has(type));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Please attach the following before submitting: ${missing.map((m) => DOC_LABELS[m] || m).join(', ')}`,
        );
      }
    }

    // Payment reference must be unique across all payments — reject a reused one
    // with a clear message instead of a 500 unique-constraint crash.
    const reference = dto.paymentReferenceId?.trim();
    if (!reference) {
      throw new BadRequestException('A payment reference number is required');
    }
    const existingPayment = await this.prisma.payment.findUnique({ where: { referenceNumber: reference } });
    if (existingPayment) {
      throw new BadRequestException('This payment reference number has already been used. Please enter the reference from your own deposit slip.');
    }

    const serialNumber = await this.generateSerialNumber();

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        serialNumber,
        paymentReferenceId: reference,
        submittedAt: new Date(),
        payment: {
          create: {
            amount: application.totalFee,
            referenceNumber: reference,
            verificationStatus: 'PENDING',
          },
        },
        approvals: {
          create: [
            { stage: 1, status: 'PENDING' }, // Stage 1: Exam Division data-validity check
          ],
        },
      },
      include: {
        applicationSubjects: { include: { subject: true } },
        payment: true,
        approvals: true,
      },
    });

    return updated;
  }

  // Stage 1 — Exam Division checks the filled data's validity. They may either
  // reject the application (remark required) or forward it to Finance for
  // payment verification.
  async examReview(userId: string, id: string, dto: ReviewActionDto) {
    const application = await this.prisma.application.findFirst({
      where: { id, deletedAt: null },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== 'SUBMITTED') {
      throw new BadRequestException(
        'Only submitted applications awaiting exam division verification can be reviewed here',
      );
    }

    if (dto.action === 'REJECT') {
      if (!dto.remark || !dto.remark.trim()) {
        throw new BadRequestException('A remark is required when rejecting an application');
      }
      await this.prisma.$transaction([
        this.prisma.application.update({ where: { id }, data: { status: 'REJECTED' } }),
        this.prisma.approval.updateMany({
          where: { applicationId: id, stage: 1 },
          data: { status: 'REJECTED', approvedBy: userId, approvedAt: new Date() },
        }),
        this.prisma.remark.create({
          data: { applicationId: id, userId, content: dto.remark.trim() },
        }),
      ]);
      return this.findOneStaff(id);
    }

    // FORWARD → mark exam division stage approved and open the finance stage.
    const ops: any[] = [
      this.prisma.application.update({ where: { id }, data: { status: 'PAYMENT_PENDING' } }),
      this.prisma.approval.updateMany({
        where: { applicationId: id, stage: 1 },
        data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
      }),
      this.prisma.approval.upsert({
        where: { applicationId_stage: { applicationId: id, stage: 2 } },
        update: { status: 'PENDING' },
        create: { applicationId: id, stage: 2, status: 'PENDING' }, // Stage 2: Finance payment verification
      }),
    ];
    if (dto.remark && dto.remark.trim()) {
      ops.push(
        this.prisma.remark.create({ data: { applicationId: id, userId, content: dto.remark.trim() } }),
      );
    }
    await this.prisma.$transaction(ops);
    return this.findOneStaff(id);
  }

  // Stage 2 — Finance verifies the payment. They may approve (payment confirmed)
  // or reject (remark required). Status is kept on the application so the staff
  // list reflects the outcome.
  async financeReview(userId: string, id: string, dto: PaymentReviewDto) {
    const application = await this.prisma.application.findFirst({
      where: { id, deletedAt: null },
      include: { payment: true },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== 'PAYMENT_PENDING') {
      throw new BadRequestException(
        'Only applications awaiting payment verification can be reviewed by Finance',
      );
    }

    if (dto.action === 'REJECT') {
      if (!dto.remark || !dto.remark.trim()) {
        throw new BadRequestException('A remark is required when rejecting a payment');
      }
      const ops: any[] = [
        this.prisma.application.update({ where: { id }, data: { status: 'PAYMENT_REJECTED' } }),
        this.prisma.approval.updateMany({
          where: { applicationId: id, stage: 2 },
          data: { status: 'REJECTED', approvedBy: userId, approvedAt: new Date() },
        }),
        this.prisma.remark.create({
          data: { applicationId: id, userId, content: dto.remark.trim() },
        }),
      ];
      if (application.payment) {
        ops.push(
          this.prisma.payment.update({
            where: { applicationId: id },
            data: { verificationStatus: 'REJECTED', verifiedBy: userId, verifiedAt: new Date() },
          }),
        );
      }
      await this.prisma.$transaction(ops);
      return this.findOneStaff(id);
    }

    // APPROVE → payment verified.
    const ops: any[] = [
      this.prisma.application.update({ where: { id }, data: { status: 'PAYMENT_VERIFIED' } }),
      this.prisma.approval.updateMany({
        where: { applicationId: id, stage: 2 },
        data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
      }),
    ];
    if (application.payment) {
      ops.push(
        this.prisma.payment.update({
          where: { applicationId: id },
          data: { verificationStatus: 'VERIFIED', verifiedBy: userId, verifiedAt: new Date() },
        }),
      );
    }
    if (dto.remark && dto.remark.trim()) {
      ops.push(
        this.prisma.remark.create({ data: { applicationId: id, userId, content: dto.remark.trim() } }),
      );
    }
    await this.prisma.$transaction(ops);
    return this.findOneStaff(id);
  }

  async cancel(userId: string, id: string) {
    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) throw new NotFoundException('Student not found');

    const application = await this.prisma.application.findFirst({
      where: { id, studentId: student.id, deletedAt: null },
    });

    if (!application) throw new NotFoundException('Application not found');
    if (!['DRAFT', 'SUBMITTED'].includes(application.status)) {
      throw new ForbiddenException('Application cannot be cancelled at this stage');
    }

    return this.prisma.application.update({
      where: { id },
      data: { status: 'CANCELLED', deletedAt: new Date() },
    });
  }

  // Staff: get all applications (with optional filters).
  // DRAFT applications are private to the student and excluded from staff views.
  async findAllStaff(filters: {
    status?: string; statuses?: string[]; type?: string; search?: string;
    dateFrom?: string; dateTo?: string;
  }) {
    const where: any = { deletedAt: null };
    if (filters.statuses && filters.statuses.length > 0) {
      where.status = { in: filters.statuses };
    } else if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = { not: 'DRAFT' };
    }
    if (filters.type) where.type = filters.type;

    // Date range on submittedAt
    if (filters.dateFrom || filters.dateTo) {
      where.submittedAt = {};
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        from.setHours(0, 0, 0, 0);
        where.submittedAt.gte = from;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        where.submittedAt.lte = to;
      }
    }

    if (filters.search) {
      where.student = {
        OR: [
          { fullName: { contains: filters.search, mode: 'insensitive' } },
          { batchNumber: { contains: filters.search, mode: 'insensitive' } },
          { registrationNumber: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    return this.prisma.application.findMany({
      where,
      include: {
        student: true,
        applicationSubjects: { include: { subject: true } },
        payment: true,
        approvals: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // Staff dashboard aggregate statistics.
  async getStats() {
    const base = { deletedAt: null, status: { not: 'DRAFT' } };

    const [total, submitted, underReview, approved, rejected, returned, repeat, medical, pendingPayment] =
      await Promise.all([
        this.prisma.application.count({ where: base }),
        this.prisma.application.count({ where: { ...base, status: 'SUBMITTED' } }),
        this.prisma.application.count({ where: { ...base, status: 'UNDER_REVIEW' } }),
        this.prisma.application.count({ where: { ...base, status: 'APPROVED' } }),
        this.prisma.application.count({ where: { ...base, status: 'REJECTED' } }),
        this.prisma.application.count({ where: { ...base, status: 'RETURNED' } }),
        this.prisma.application.count({ where: { ...base, type: 'REPEAT' } }),
        this.prisma.application.count({ where: { ...base, type: 'MEDICAL' } }),
        this.prisma.payment.count({ where: { verificationStatus: 'PENDING', deletedAt: null } }),
      ]);

    const pending = submitted + underReview + returned;
    const revenue = await this.prisma.payment.aggregate({
      where: { verificationStatus: 'VERIFIED', deletedAt: null },
      _sum: { amount: true },
    });

    return {
      total,
      pending,
      submitted,
      underReview,
      returned,
      approved,
      rejected,
      byType: { repeat, medical },
      pendingPayments: pendingPayment,
      verifiedRevenue: revenue._sum.amount ?? 0,
    };
  }

  async findOneStaff(id: string) {
    const application = await this.prisma.application.findFirst({
      where: { id, deletedAt: null },
      include: {
        student: true,
        applicationSubjects: { include: { subject: true } },
        payment: true,
        approvals: true,
        remarks: { include: { user: { select: { email: true, staffUser: true } } } },
        documents: true,
      },
    });

    if (!application) throw new NotFoundException('Application not found');
    return application;
  }
}

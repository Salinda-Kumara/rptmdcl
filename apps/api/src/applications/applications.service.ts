import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateApplicationDto, SubmitApplicationDto, ReviewActionDto, PaymentReviewDto, RollbackDto, FinalApprovalDto, FinalRejectDto, BulkApproveDto, DeclineSubjectDto, ResubmitApplicationDto } from './dtos/application.dto';

// Fee structure in LKR (whole rupees, as per the physical form)
// Medical (re-sit on medical ground): LKR 5,200 per subject
// Repeat / Re-Repeat: LKR 2,600 per subject
const MEDICAL_FEE_PER_SUBJECT = 5200;
const REPEAT_FEE_PER_SUBJECT = 2600;
const FIRST_ATTEMPT_FEE_PER_SUBJECT = 5200;

// Per-subject examination fee, driven by the subject's category. Repeat is the
// discounted rate; Medical and 1st-Attempt re-sits are charged the higher rate.
const feeForCategory = (category: string): number =>
  category === 'REPEAT' ? REPEAT_FEE_PER_SUBJECT
  : category === '1ST_ATTEMPT' ? FIRST_ATTEMPT_FEE_PER_SUBJECT
  : MEDICAL_FEE_PER_SUBJECT;

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

  // Live applications that still "occupy" a subject/date. Draft (provisional),
  // rejected and cancelled ones don't block — the student may apply again.
  private static readonly ACTIVE_STATUSES = ['SUBMITTED', 'PAYMENT_PENDING', 'PAYMENT_VERIFIED', 'APPROVED'];

  /**
   * Block applying for the same subject on the same exam date more than once.
   * Considers the student's active (non-rejected/cancelled) applications,
   * excluding `ignoreApplicationId` (e.g. the draft being submitted).
   */
  private async assertNoDuplicateSubjects(
    studentId: string,
    subjects: { subjectId: string; upcomingExamDate?: string | Date | null }[],
    ignoreApplicationId?: string,
  ) {
    const dayOf = (d?: string | Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : null);

    // Duplicates within the same submission.
    const seen = new Set<string>();
    for (const s of subjects) {
      const k = `${s.subjectId}::${dayOf(s.upcomingExamDate)}`;
      if (seen.has(k)) throw new ConflictException('The same subject cannot be added twice for the same exam date.');
      seen.add(k);
    }

    const existing = await this.prisma.applicationSubject.findMany({
      where: {
        subjectId: { in: subjects.map((s) => s.subjectId) },
        application: {
          studentId,
          deletedAt: null,
          status: { in: ApplicationsService.ACTIVE_STATUSES },
          ...(ignoreApplicationId ? { id: { not: ignoreApplicationId } } : {}),
        },
      },
      include: { subject: { select: { code: true, name: true } } },
    });

    const clash: string[] = [];
    for (const s of subjects) {
      const dup = existing.find((e) => e.subjectId === s.subjectId && dayOf(e.upcomingExamDate) === dayOf(s.upcomingExamDate));
      if (dup) clash.push(dup.subject?.code ?? s.subjectId);
    }
    if (clash.length) {
      throw new ConflictException(
        `You have already applied for ${clash.join(', ')} on the same exam date. You can re-apply only if the earlier application was rejected.`,
      );
    }
  }

  async create(userId: string, dto: CreateApplicationDto) {
    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) throw new NotFoundException('Student not found');

    if (dto.subjects.length === 0) {
      throw new BadRequestException('At least one subject is required');
    }

    await this.assertNoDuplicateSubjects(student.id, dto.subjects);

    // Fee is summed per subject from each subject's category. The application
    // type is derived from the categories: any Medical subject makes the whole
    // application MEDICAL (so a medical certificate is required), otherwise
    // REPEAT.
    const totalFee = dto.subjects.reduce((sum, s) => sum + feeForCategory(s.category), 0);
    const derivedType = dto.subjects.some((s) => s.category === 'MEDICAL') ? 'MEDICAL' : 'REPEAT';

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
        type: derivedType,
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
            secondAttemptDate: s.secondAttemptDate ? new Date(s.secondAttemptDate) : undefined,
            secondAttemptIntake: s.secondAttemptIntake,
            secondAttemptGrade: s.secondAttemptGrade,
            medicalApprovalSerial: s.medicalApprovalSerial,
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
        // Soft-deleted attachments (e.g. replaced during editing) must never
        // reach the client — their files are gone from storage, so surfacing
        // them causes a 404 when something (like the print packet) tries to
        // download one.
        documents: { where: { deletedAt: null } },
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

    // Re-check duplicates at submit (a live application may have appeared since
    // this draft was created). Ignore this draft itself.
    const draftSubjects = await this.prisma.applicationSubject.findMany({
      where: { applicationId: id },
      select: { subjectId: true, upcomingExamDate: true },
    });
    await this.assertNoDuplicateSubjects(student.id, draftSubjects, id);

    // Enforce mandatory attachments before submission.
    const docs = await this.prisma.document.findMany({
      where: { applicationId: id, deletedAt: null },
      select: { documentType: true, applicationSubjectId: true },
    });

    // A payment slip is always required. Medical certificates are optional —
    // students may attach one per subject, but submission isn't blocked without it.
    const presentTypes = new Set(docs.map((d) => d.documentType));
    if (!presentTypes.has('PAYMENT_SLIP')) {
      throw new BadRequestException(
        `Please attach the following before submitting: ${DOC_LABELS['PAYMENT_SLIP']}`,
      );
    }

    // A reference is required, but it need not be unique — the same reference
    // may be reused across applications.
    const reference = dto.paymentReferenceId?.trim();
    if (!reference) {
      throw new BadRequestException('A payment reference number is required');
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

    // RETURN → hand the application back to the student for correction. The exam
    // stage stays pending so it comes back to this queue once resubmitted.
    if (dto.action === 'RETURN') {
      if (!dto.remark || !dto.remark.trim()) {
        throw new BadRequestException('A remark is required when returning an application for correction');
      }
      await this.prisma.$transaction([
        this.prisma.application.update({ where: { id }, data: { status: 'RETURNED' } }),
        this.prisma.approval.updateMany({
          where: { applicationId: id, stage: 1 },
          data: { status: 'PENDING', approvedBy: null, approvedAt: null },
        }),
        this.prisma.remark.create({
          data: { applicationId: id, userId, content: dto.remark.trim() },
        }),
      ]);
      return this.findOneStaff(id);
    }

    // FORWARD → mark exam division stage approved and open the finance stage.
    // At least one subject must remain ACTIVE (not declined) to forward.
    const activeCount = await this.prisma.applicationSubject.count({
      where: { applicationId: id, status: 'ACTIVE' },
    });
    if (activeCount === 0) {
      throw new BadRequestException(
        'All subjects have been declined. Reject the application instead of forwarding it.',
      );
    }
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

  // Exam Division — decline a single subject on a submitted application while
  // keeping the rest. The subject is marked DECLINED (excluded from admissions);
  // the paid total is intentionally left unchanged. A reason is recorded.
  async declineSubject(userId: string, id: string, subjectRowId: string, dto: DeclineSubjectDto) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('A reason is required to decline a subject');
    }
    const application = await this.prisma.application.findFirst({
      where: { id, deletedAt: null },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== 'SUBMITTED') {
      throw new BadRequestException('Subjects can only be declined while the application awaits Exam Division verification');
    }

    const row = await this.prisma.applicationSubject.findFirst({
      where: { id: subjectRowId, applicationId: id },
      include: { subject: { select: { code: true } } },
    });
    if (!row) throw new NotFoundException('Subject not found on this application');
    if (row.status === 'DECLINED') {
      throw new BadRequestException('This subject has already been declined');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: userId }, include: { staffUser: true },
    });
    const actorName = actor?.staffUser?.name ?? actor?.email ?? userId;

    await this.prisma.$transaction([
      this.prisma.applicationSubject.update({
        where: { id: subjectRowId },
        data: { status: 'DECLINED', declineReason: dto.reason.trim(), declinedAt: new Date(), declinedBy: actorName },
      }),
      this.prisma.remark.create({
        data: { applicationId: id, userId, content: `Declined subject ${row.subject?.code ?? subjectRowId}: ${dto.reason.trim()}` },
      }),
    ]);
    return this.findOneStaff(id);
  }

  // Student — apply corrections to a RETURNED application and resubmit it. The
  // subject set and categories (which set the fee) are fixed; only data fields
  // and the applicant snapshot may change. Resubmitting sends it back to the
  // Exam Division queue (status SUBMITTED). The serial number is preserved.
  async resubmit(userId: string, id: string, dto: ResubmitApplicationDto) {
    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) throw new NotFoundException('Student not found');

    const application = await this.prisma.application.findFirst({
      where: { id, studentId: student.id, deletedAt: null },
      include: { applicationSubjects: true },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== 'RETURNED') {
      throw new BadRequestException('Only a returned application can be resubmitted');
    }

    const ops: any[] = [];

    // Merge the applicant snapshot with any corrected fields. Identity fields are
    // kept from the existing snapshot (the student cannot change them).
    if (dto.applicant) {
      const cur: any = (application.applicantDetails as any) ?? {};
      const a = dto.applicant;
      const merged = {
        ...cur,
        fullName: a.fullName ?? cur.fullName,
        nameWithInitials: a.nameWithInitials ?? cur.nameWithInitials,
        permanentAddress: a.permanentAddress ?? cur.permanentAddress,
        postalAddress: a.postalAddress ?? cur.postalAddress,
        telephone: a.telephone ?? cur.telephone,
        mobile: a.mobile ?? cur.mobile,
        email: a.email ?? cur.email,
      };
      ops.push(this.prisma.application.update({ where: { id }, data: { applicantDetails: merged } }));
    }

    // Update each named subject row's editable data fields (row must belong here).
    const ownRowIds = new Set(application.applicationSubjects.map((s) => s.id));
    for (const s of dto.subjects ?? []) {
      if (!ownRowIds.has(s.id)) throw new BadRequestException('Subject does not belong to this application');
      ops.push(this.prisma.applicationSubject.update({
        where: { id: s.id },
        data: {
          ...(s.caMarks !== undefined ? { caMarks: s.caMarks } : {}),
          ...(s.upcomingExamIntake !== undefined ? { upcomingExamIntake: s.upcomingExamIntake } : {}),
          ...(s.upcomingExamDate !== undefined ? { upcomingExamDate: s.upcomingExamDate ? new Date(s.upcomingExamDate) : null } : {}),
          ...(s.previousExamDate !== undefined ? { previousExamDate: s.previousExamDate ? new Date(s.previousExamDate) : null } : {}),
          ...(s.previousExamIntake !== undefined ? { previousExamIntake: s.previousExamIntake } : {}),
          ...(s.gradeEarned !== undefined ? { gradeEarned: s.gradeEarned } : {}),
          ...(s.secondAttemptDate !== undefined ? { secondAttemptDate: s.secondAttemptDate ? new Date(s.secondAttemptDate) : null } : {}),
          ...(s.secondAttemptIntake !== undefined ? { secondAttemptIntake: s.secondAttemptIntake } : {}),
          ...(s.secondAttemptGrade !== undefined ? { secondAttemptGrade: s.secondAttemptGrade } : {}),
          ...(s.medicalApprovalSerial !== undefined ? { medicalApprovalSerial: s.medicalApprovalSerial } : {}),
        },
      }));
    }

    ops.push(
      this.prisma.application.update({ where: { id }, data: { status: 'SUBMITTED', submittedAt: new Date() } }),
      this.prisma.remark.create({ data: { applicationId: id, userId, content: 'Resubmitted by student after correction.' } }),
    );

    await this.prisma.$transaction(ops);
    return this.findOne(userId, id);
  }

  // Stage 2 — Finance verifies the payment. They may approve (payment confirmed)
  // or reject (remark required). Status is kept on the application so the staff
  // list reflects the outcome.
  async financeReview(user: any, id: string, dto: PaymentReviewDto) {
    const userId = user.id;
    // Resolved display name stamped on the payment slip (and shown as the
    // verifier) — matches the admissionPrintedBy convention.
    const verifierName = user?.staffUser?.name ?? user?.email ?? user?.id;

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
            data: { verificationStatus: 'REJECTED', verifiedBy: verifierName, verifiedAt: new Date() },
          }),
        );
      }
      await this.prisma.$transaction(ops);
      return this.findOneStaff(id);
    }

    // APPROVE → payment verified. Finance is stage 2; approving here marks the
    // payment VERIFIED and hands off to the Exam Registrar (stage 3) for the
    // final approval that makes the application eligible for admission.
    const ops: any[] = [
      this.prisma.application.update({ where: { id }, data: { status: 'PAYMENT_VERIFIED' } }),
      this.prisma.approval.updateMany({
        where: { applicationId: id, stage: 2 },
        data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
      }),
      this.prisma.approval.upsert({
        where: { applicationId_stage: { applicationId: id, stage: 3 } },
        update: { status: 'PENDING' },
        create: { applicationId: id, stage: 3, status: 'PENDING' }, // Stage 3: Exam Registrar final approval
      }),
    ];
    if (application.payment) {
      ops.push(
        this.prisma.payment.update({
          where: { applicationId: id },
          data: { verificationStatus: 'VERIFIED', verifiedBy: verifierName, verifiedAt: new Date() },
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

  // Stage 3 — Exam Registrar gives the final approval. Only a payment-verified
  // application can be approved here; approving marks the whole application
  // APPROVED, which is what makes its subjects appear in Admissions.
  async registrarApprove(userId: string, id: string, dto: FinalApprovalDto) {
    const application = await this.prisma.application.findFirst({
      where: { id, deletedAt: null },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== 'PAYMENT_VERIFIED') {
      throw new BadRequestException(
        'Only payment-verified applications awaiting final approval can be approved here',
      );
    }

    const ops: any[] = [
      this.prisma.application.update({ where: { id }, data: { status: 'APPROVED' } }),
      this.prisma.approval.upsert({
        where: { applicationId_stage: { applicationId: id, stage: 3 } },
        update: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
        create: { applicationId: id, stage: 3, status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
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

  // Stage 3 — Exam Registrar rejects a payment-verified application. A remark is
  // required; the application moves to REJECTED and stage 3 is marked rejected.
  async registrarReject(userId: string, id: string, dto: FinalRejectDto) {
    if (!dto.remark || !dto.remark.trim()) {
      throw new BadRequestException('A remark is required when rejecting an application');
    }
    const application = await this.prisma.application.findFirst({
      where: { id, deletedAt: null },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== 'PAYMENT_VERIFIED') {
      throw new BadRequestException(
        'Only payment-verified applications awaiting final approval can be rejected here',
      );
    }
    await this.prisma.$transaction([
      this.prisma.application.update({ where: { id }, data: { status: 'REJECTED' } }),
      this.prisma.approval.upsert({
        where: { applicationId_stage: { applicationId: id, stage: 3 } },
        update: { status: 'REJECTED', approvedBy: userId, approvedAt: new Date() },
        create: { applicationId: id, stage: 3, status: 'REJECTED', approvedBy: userId, approvedAt: new Date() },
      }),
      this.prisma.remark.create({ data: { applicationId: id, userId, content: dto.remark.trim() } }),
    ]);
    return this.findOneStaff(id);
  }

  // Stage 3 — approve several payment-verified applications at once. Each is
  // approved individually; ids not in PAYMENT_VERIFIED are skipped and reported.
  async registrarApproveBulk(userId: string, dto: BulkApproveDto) {
    const ids = Array.from(new Set(dto.ids ?? [])).filter(Boolean);
    if (ids.length === 0) throw new BadRequestException('No applications selected');

    const eligible = await this.prisma.application.findMany({
      where: { id: { in: ids }, deletedAt: null, status: 'PAYMENT_VERIFIED' },
      select: { id: true },
    });
    const eligibleIds = eligible.map((e) => e.id);
    const remark = dto.remark && dto.remark.trim() ? dto.remark.trim() : null;

    const ops: any[] = [];
    for (const id of eligibleIds) {
      ops.push(
        this.prisma.application.update({ where: { id }, data: { status: 'APPROVED' } }),
        this.prisma.approval.upsert({
          where: { applicationId_stage: { applicationId: id, stage: 3 } },
          update: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
          create: { applicationId: id, stage: 3, status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
        }),
      );
      if (remark) ops.push(this.prisma.remark.create({ data: { applicationId: id, userId, content: remark } }));
    }
    if (ops.length) await this.prisma.$transaction(ops);

    return {
      approved: eligibleIds,
      skipped: ids.filter((id) => !eligibleIds.includes(id)),
    };
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
        remarks: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { email: true, staffUser: { select: { name: true } } } } },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // Applications eligible for an admission card. Only those given final approval
  // by the Exam Registrar (status APPROVED) appear here. Used by the Admissions
  // screen.
  async findAdmissions() {
    return this.prisma.application.findMany({
      where: { deletedAt: null, status: 'APPROVED' },
      include: {
        student: true,
        // Declined subjects are not admitted — only ACTIVE ones appear here.
        applicationSubjects: { where: { status: 'ACTIVE' }, include: { subject: true } },
        payment: true,
        approvals: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // Mark (or unmark) a subject's admission card as printed. Staff may set it to
  // printed; only an admin may reset a printed one back to unprinted.
  async markAdmissionPrinted(subjectId: string, user: any, printed: boolean) {
    const sub = await this.prisma.applicationSubject.findUnique({ where: { id: subjectId } });
    if (!sub) throw new NotFoundException('Application subject not found');
    if (!user?.isAdmin && sub.admissionPrinted && !printed) {
      throw new ForbiddenException('Only an administrator can reset a printed admission');
    }
    return this.prisma.applicationSubject.update({
      where: { id: subjectId },
      data: {
        admissionPrinted: printed,
        admissionPrintedAt: printed ? new Date() : null,
        admissionPrintedBy: printed ? (user?.staffUser?.name ?? user?.email ?? user?.id ?? null) : null,
      },
    });
  }

  // Timetable rows (course code → exam date + session times) from schedules with
  // "enable for apply" on — the admission card fills its Date/Time columns from these.
  async admissionScheduledExams() {
    return this.prisma.scheduledExam.findMany({
      where: { schedule: { applyEnabled: true, deletedAt: null } },
      select: {
        courseCode: true, courseName: true, examDate: true, revisedDate: true,
        session1: true, session2: true, session3: true, location: true, intake: true,
        schedule: { select: { startDate: true, endDate: true } },
      },
      orderBy: { examDate: 'asc' },
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

  // Roll an application back one stage. Used to correct a wrongly-processed
  // application (e.g. accepted by mistake). Reverts the status AND the related
  // approval / payment records so the earlier stage can act on it again, and
  // records an audit remark. Gated by the `rollback` permission at the route.
  private static readonly ROLLBACK_PREV: Record<string, string> = {
    // Registrar final approval lands on APPROVED → undoing reopens stage 3.
    APPROVED:         'PAYMENT_VERIFIED',
    // Finance payment verification lands on PAYMENT_VERIFIED → undoing reopens
    // the finance stage.
    PAYMENT_VERIFIED: 'PAYMENT_PENDING',
    PAYMENT_REJECTED: 'PAYMENT_PENDING',
    PAYMENT_PENDING:  'SUBMITTED',
    REJECTED:         'SUBMITTED',
  };

  async rollback(userId: string, id: string, dto: RollbackDto) {
    // Confirm the acting user's identity before this destructive action.
    // The password MUST match the currently-logged-in user's own password —
    // another user's password will not authorise the rollback.
    if (!dto.password || !dto.password.trim()) {
      throw new UnauthorizedException('Your password is required to confirm a rollback');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password || user.deletedAt) {
      throw new UnauthorizedException('Password confirmation is not available for this account');
    }
    let passwordValid = false;
    try {
      passwordValid = await argon2.verify(user.password, dto.password);
    } catch {
      passwordValid = false;
    }
    if (!passwordValid) {
      throw new UnauthorizedException('Incorrect password');
    }

    const application = await this.prisma.application.findFirst({
      where: { id, deletedAt: null },
      include: { payment: true },
    });
    if (!application) throw new NotFoundException('Application not found');

    const prev = ApplicationsService.ROLLBACK_PREV[application.status];
    if (!prev) {
      throw new BadRequestException(
        `An application in status ${application.status} cannot be rolled back`,
      );
    }

    const ops: any[] = [
      this.prisma.application.update({ where: { id }, data: { status: prev } }),
    ];

    switch (application.status) {
      // Undo the Registrar's final approval → reopen the registrar stage. The
      // payment stays verified; only stage 3 is reset.
      case 'APPROVED':
        ops.push(
          this.prisma.approval.updateMany({
            where: { applicationId: id, stage: 3 },
            data: { status: 'PENDING', approvedBy: null, approvedAt: null },
          }),
        );
        break;

      // Undo a Finance decision → reopen the payment-verification stage, reset
      // the payment, and drop the registrar stage that the approval created.
      case 'PAYMENT_VERIFIED':
      case 'PAYMENT_REJECTED':
        ops.push(
          this.prisma.approval.updateMany({
            where: { applicationId: id, stage: 2 },
            data: { status: 'PENDING', approvedBy: null, approvedAt: null },
          }),
          this.prisma.approval.deleteMany({ where: { applicationId: id, stage: 3 } }),
        );
        if (application.payment) {
          ops.push(
            this.prisma.payment.update({
              where: { applicationId: id },
              data: { verificationStatus: 'PENDING', verifiedBy: null, verifiedAt: null },
            }),
          );
        }
        break;

      // Undo the Exam Division forward → reopen the exam stage and drop the
      // finance stage that the forward created.
      case 'PAYMENT_PENDING':
        ops.push(
          this.prisma.approval.updateMany({
            where: { applicationId: id, stage: 1 },
            data: { status: 'PENDING', approvedBy: null, approvedAt: null },
          }),
          this.prisma.approval.deleteMany({ where: { applicationId: id, stage: 2 } }),
        );
        break;

      // Undo an Exam Division rejection → reopen the exam stage.
      case 'REJECTED':
        ops.push(
          this.prisma.approval.updateMany({
            where: { applicationId: id, stage: 1 },
            data: { status: 'PENDING', approvedBy: null, approvedAt: null },
          }),
        );
        break;
    }

    const note = `Status rolled back from ${application.status} to ${prev}`;
    const content = dto.remark && dto.remark.trim() ? `${note}. ${dto.remark.trim()}` : note;
    ops.push(this.prisma.remark.create({ data: { applicationId: id, userId, content } }));

    await this.prisma.$transaction(ops);
    return this.findOneStaff(id);
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
        // Soft-deleted attachments (e.g. replaced during editing) must never
        // reach the client — their files are gone from storage, so surfacing
        // them causes a 404 when something (like the print packet) tries to
        // download one.
        documents: { where: { deletedAt: null } },
      },
    });

    if (!application) throw new NotFoundException('Application not found');
    return application;
  }
}

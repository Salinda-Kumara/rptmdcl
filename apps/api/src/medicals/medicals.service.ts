import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/documents/documents.constants';
import { programmeCodeOf } from '@/admin/student-import.util';
import { CreateMedicalSubmissionDto, MedicalReviewDto } from './dtos/medical.dto';

// Students must submit the certificate within this many days of the missed
// exam date (inclusive).
const SUBMISSION_WINDOW_DAYS = 15;

// Calendar day in Sri Lanka (YYYY-MM-DD) — the window must follow local exam
// days, not the server's timezone. en-CA formats as ISO.
const slDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
const addDays = (isoDay: string, n: number) =>
  new Date(new Date(`${isoDay}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

@Injectable()
export class MedicalsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  private async studentFor(userId: string) {
    const student = await this.prisma.student.findFirst({ where: { userId, deletedAt: null } });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  /** Is `examDate` still inside the 15-day submission window (and not in the future)? */
  private inWindow(examDate: Date, now = new Date()): boolean {
    const exam = slDay(examDate);
    const today = slDay(now);
    // The exam must have happened (today included) and today must be at most
    // 15 days after it — all compared as Sri Lanka calendar days.
    return exam <= today && today <= addDays(exam, SUBMISSION_WINDOW_DAYS);
  }

  /**
   * Scheduled exams the student may submit a medical for: published timetable
   * rows whose (revised or original) date falls within the past 15 days,
   * resolved to real Subject rows by course code.
   */
  async eligibleExams(userId: string) {
    const student = await this.studentFor(userId);

    const rows = await this.prisma.scheduledExam.findMany({
      where: { schedule: { deletedAt: null, OR: [{ published: true }, { applyEnabled: true }] } },
      select: { courseCode: true, courseName: true, examDate: true, revisedDate: true, intake: true },
    });

    const norm = (c?: string | null) => (c ?? '').toUpperCase().replace(/\s+/g, '');
    const inWindowRows = rows.filter((r) => {
      const d = r.revisedDate ?? r.examDate;
      return d && this.inWindow(d);
    });
    if (inWindowRows.length === 0) return [];

    // Only the student's OWN programme's subjects are eligible — an Applied
    // Accounting student must not see BMBA exams (and vice versa). Programme
    // comes from the student's batch; fall back to the registration-number
    // prefix (e.g. BSC/…, BMBA/…) when the batch link is missing.
    const batch = await this.prisma.batch.findFirst({
      where: { batchNumber: student.batchNumber, intake: student.intake },
      select: { programmeId: true },
    });
    let programmeId = batch?.programmeId ?? null;
    if (!programmeId) {
      const prog = await this.prisma.programme.findFirst({
        where: { code: programmeCodeOf(student.registrationNumber) },
        select: { id: true },
      });
      programmeId = prog?.id ?? null;
    }

    const subjects = await this.prisma.subject.findMany({
      where: { deletedAt: null, ...(programmeId ? { programmeId } : {}) },
      select: { id: true, code: true, name: true },
    });
    const byCode = new Map(subjects.map((s) => [norm(s.code), s]));

    return inWindowRows.flatMap((r) => {
      const subj = byCode.get(norm(r.courseCode));
      if (!subj) return [];
      const d = (r.revisedDate ?? r.examDate)!;
      return [{
        subjectId: subj.id,
        code: subj.code,
        name: subj.name,
        examDate: d,
        intake: r.intake ?? null,
      }];
    });
  }

  /** Create a draft submission with its absence rows (certificate uploads follow). */
  async create(userId: string, dto: CreateMedicalSubmissionDto) {
    const student = await this.studentFor(userId);
    if (!dto.items?.length) throw new BadRequestException('Add at least one missed exam');

    // Every row must still be inside the 15-day window.
    for (const it of dto.items) {
      if (!this.inWindow(new Date(it.examDate))) {
        throw new BadRequestException(
          `Medical certificates must be submitted within ${SUBMISSION_WINDOW_DAYS} days of the exam date`,
        );
      }
    }

    // No duplicate live submission for the same subject + exam date.
    const dup = await this.prisma.medicalSubmissionItem.findFirst({
      where: {
        subjectId: { in: dto.items.map((i) => i.subjectId) },
        submission: { studentId: student.id, deletedAt: null, status: { in: ['SUBMITTED', 'APPROVED'] } },
      },
      include: { subject: { select: { code: true } } },
    });
    if (dup && dto.items.some((i) => i.subjectId === dup.subjectId && slDay(new Date(i.examDate)) === slDay(dup.examDate))) {
      throw new ConflictException(`You already have a live medical submission for ${dup.subject?.code ?? 'this subject'} on that date`);
    }

    const applicantDetails = {
      fullName: student.fullName,
      nameWithInitials: student.nameWithInitials ?? '',
      permanentAddress: dto.permanentAddress?.trim() || student.permanentAddress,
      contactNumbers: dto.contactNumbers?.trim() || [student.mobile, student.telephone].filter(Boolean).join(' / '),
      nic: student.nic,
      registrationNumber: student.registrationNumber,
      intake: student.intake,
    };

    return this.prisma.medicalSubmission.create({
      data: {
        studentId: student.id,
        status: 'DRAFT',
        totalDays: dto.totalDays,
        applicantDetails,
        items: {
          create: dto.items.map((i) => ({ subjectId: i.subjectId, examDate: new Date(i.examDate) })),
        },
      },
      include: { items: { include: { subject: true } } },
    });
  }

  /** Upload a medical certificate onto a DRAFT submission. */
  async uploadCertificate(userId: string, submissionId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('File exceeds the 10MB limit');
    const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException('Only PDF, JPG and PNG files are allowed');
    }

    const student = await this.studentFor(userId);
    const sub = await this.prisma.medicalSubmission.findFirst({
      where: { id: submissionId, studentId: student.id, deletedAt: null },
    });
    if (!sub) throw new NotFoundException('Medical submission not found');
    if (sub.status !== 'DRAFT') throw new ForbiddenException('Certificates cannot be changed after submission');

    const storagePath = await this.storage.put(`medical-${submissionId}`, file.originalname, file.buffer);
    return this.prisma.document.create({
      data: {
        medicalSubmissionId: submissionId,
        documentType: 'MEDICAL_CERTIFICATE',
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        minioPath: storagePath,
        uploadedBy: userId,
      },
    });
  }

  /** Finalize: DRAFT → SUBMITTED (requires at least one certificate). */
  async submit(userId: string, id: string) {
    const student = await this.studentFor(userId);
    const sub = await this.prisma.medicalSubmission.findFirst({
      where: { id, studentId: student.id, deletedAt: null },
      include: { items: true, documents: { where: { deletedAt: null } } },
    });
    if (!sub) throw new NotFoundException('Medical submission not found');
    if (sub.status !== 'DRAFT') throw new BadRequestException('This submission has already been sent');
    if (!sub.documents.some((d) => d.documentType === 'MEDICAL_CERTIFICATE')) {
      throw new BadRequestException('Attach the medical certificate before submitting');
    }
    // Window re-checked at the moment of actual submission.
    for (const it of sub.items) {
      if (!this.inWindow(it.examDate)) {
        throw new BadRequestException(
          `The ${SUBMISSION_WINDOW_DAYS}-day submission window for one of the selected exams has passed`,
        );
      }
    }
    return this.prisma.medicalSubmission.update({
      where: { id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
      include: { items: { include: { subject: true } }, documents: { where: { deletedAt: null } } },
    });
  }

  async listMine(userId: string) {
    const student = await this.studentFor(userId);
    return this.prisma.medicalSubmission.findMany({
      where: { studentId: student.id, deletedAt: null, status: { not: 'DRAFT' } },
      include: { items: { include: { subject: true } }, documents: { where: { deletedAt: null } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Approved, not-yet-consumed absences — offered when the student fills the
   * next exam application (auto-fills serial + attaches the certificate).
   */
  async approvedAvailable(userId: string) {
    const student = await this.studentFor(userId);
    const items = await this.prisma.medicalSubmissionItem.findMany({
      where: {
        usedByApplicationSubjectId: null,
        submission: { studentId: student.id, status: 'APPROVED', deletedAt: null },
      },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        submission: { select: { id: true, serialNumber: true } },
      },
      orderBy: { examDate: 'desc' },
    });
    return items.map((i) => ({
      itemId: i.id,
      subjectId: i.subjectId,
      subjectCode: i.subject.code,
      subjectName: i.subject.name,
      examDate: i.examDate,
      serialNumber: i.submission.serialNumber,
      submissionId: i.submission.id,
    }));
  }

  /* ── Staff ── */

  async listStaff(status?: string) {
    return this.prisma.medicalSubmission.findMany({
      where: {
        deletedAt: null,
        status: status ? status : { not: 'DRAFT' },
      },
      include: {
        student: { select: { fullName: true, registrationNumber: true, batchNumber: true, nic: true } },
        items: { include: { subject: { select: { code: true, name: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findOneStaff(id: string) {
    const sub = await this.prisma.medicalSubmission.findFirst({
      where: { id, deletedAt: null },
      include: {
        student: true,
        items: { include: { subject: true } },
        documents: { where: { deletedAt: null } },
      },
    });
    if (!sub) throw new NotFoundException('Medical submission not found');
    return sub;
  }

  /** Next Medical Verification Serial, e.g. MED/20260723/001. */
  private async nextSerial(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}${m}${d}`;
    const prefix = `MED/${dateStr}/`;
    const count = await this.prisma.medicalSubmission.count({
      where: { serialNumber: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  }

  /** Exam Verification Officer decision. Approving assigns the serial. */
  async review(user: any, id: string, dto: MedicalReviewDto) {
    const reviewer = user?.staffUser?.name ?? user?.email ?? user?.id;
    const sub = await this.prisma.medicalSubmission.findFirst({ where: { id, deletedAt: null } });
    if (!sub) throw new NotFoundException('Medical submission not found');
    if (sub.status !== 'SUBMITTED') {
      throw new BadRequestException('Only submitted medical applications can be reviewed');
    }

    if (dto.action === 'REJECT') {
      if (!dto.remark?.trim()) throw new BadRequestException('A remark is required when rejecting');
      await this.prisma.medicalSubmission.update({
        where: { id },
        data: { status: 'REJECTED', reviewRemarks: dto.remark.trim(), reviewedBy: reviewer, reviewedAt: new Date() },
      });
      return this.findOneStaff(id);
    }

    // APPROVE — retry on the (rare) serial collision from a concurrent approval.
    for (let attempt = 0; attempt < 3; attempt++) {
      const serialNumber = await this.nextSerial();
      try {
        await this.prisma.medicalSubmission.update({
          where: { id },
          data: {
            status: 'APPROVED',
            serialNumber,
            reviewRemarks: dto.remark?.trim() || null,
            reviewedBy: reviewer,
            reviewedAt: new Date(),
          },
        });
        return this.findOneStaff(id);
      } catch (e: any) {
        if (e?.code !== 'P2002') throw e; // not a unique-serial clash
      }
    }
    throw new ConflictException('Could not assign a serial number — please try again');
  }

  /**
   * Free the medical items consumed by an application's subjects — called when
   * that application is rejected or cancelled, so the approved medical can be
   * used on a future application instead.
   */
  static async releaseItemsForApplication(prisma: PrismaService, applicationId: string) {
    const subjectRows = await prisma.applicationSubject.findMany({
      where: { applicationId },
      select: { id: true },
    });
    if (!subjectRows.length) return;
    await prisma.medicalSubmissionItem.updateMany({
      where: { usedByApplicationSubjectId: { in: subjectRows.map((s) => s.id) } },
      data: { usedByApplicationSubjectId: null },
    });
  }
}

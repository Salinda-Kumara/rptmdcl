import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateStaffUserDto,
  UpdateStaffUserDto,
  CreateProgrammeDto,
  UpdateProgrammeDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  CreateBatchDto,
  UpdateBatchDto,
  CreateExamScheduleDto,
  UpdateExamScheduleDto,
  CreateExamStaffDto,
  UpdateExamStaffDto,
  CreateExamLocationDto,
  UpdateExamLocationDto,
  CreateScheduledExamDto,
  UpdateScheduledExamDto,
  CreateStudentDto,
  UpdateStudentDto,
} from './dtos/admin.dto';
import {
  parseStudentWorkbook,
  ParsedStudent,
  deriveIntake,
  programmeCodeOf,
  PROGRAMME_NAMES,
} from './student-import.util';
import { parseExamScheduleWorkbook } from './exam-schedule-import.util';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /* ════════════════ Dashboard ════════════════ */
  async getStats() {
    const [
      totalUsers,
      totalStudents,
      totalStaff,
      totalProgrammes,
      totalSubjects,
      totalBatches,
      totalSchedules,
      totalApplications,
      applicationsByStatus,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.student.count({ where: { deletedAt: null } }),
      this.prisma.staffUser.count(),
      this.prisma.programme.count({ where: { deletedAt: null } }),
      this.prisma.subject.count({ where: { deletedAt: null } }),
      this.prisma.batch.count({ where: { deletedAt: null } }),
      this.prisma.examinationSchedule.count({ where: { deletedAt: null } }),
      this.prisma.application.count({ where: { deletedAt: null, status: { not: 'DRAFT' } } }),
      this.prisma.application.groupBy({
        by: ['status'],
        where: { deletedAt: null, status: { not: 'DRAFT' } },
        _count: true,
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const row of applicationsByStatus) {
      statusCounts[row.status] = row._count;
    }

    const revenue = await this.prisma.payment.aggregate({
      where: { verificationStatus: 'VERIFIED', deletedAt: null },
      _sum: { amount: true },
    });

    return {
      totalUsers,
      totalStudents,
      totalStaff,
      totalProgrammes,
      totalSubjects,
      totalBatches,
      totalSchedules,
      totalApplications,
      statusCounts,
      verifiedRevenue: revenue._sum.amount ?? 0,
    };
  }

  /* ════════════════ Users & Permissions ════════════════ */
  async listUsers() {
    // Include deactivated staff (deletedAt set) so admins can reactivate them.
    const users = await this.prisma.user.findMany({
      where: { staffUser: { isNot: null } },
      include: {
        staffUser: true,
        permissions: true,
      },
      orderBy: [{ deletedAt: 'asc' }, { createdAt: 'desc' }], // active first
    });

    // Never leak password hashes.
    return users.map(({ password, ...u }) => u);
  }

  async createStaffUser(dto: CreateStaffUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    if (!dto.isAdmin && (!dto.permissions || dto.permissions.length === 0)) {
      throw new BadRequestException('Grant at least one permission, or mark the user as Master Admin');
    }

    const password = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password,
        isAdmin: dto.isAdmin ?? false,
        staffUser: { create: { name: dto.name, position: dto.position } },
        permissions: dto.isAdmin
          ? undefined
          : { create: (dto.permissions ?? []).map((p) => ({ resource: p.resource, level: p.level })) },
      },
      include: { staffUser: true, permissions: true },
    });

    const { password: _pw, ...safe } = user;
    return safe;
  }

  async updateUser(id: string, dto: UpdateStaffUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { staffUser: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.staffUser) throw new BadRequestException('Only staff users can be edited here');

    const ops: any[] = [];

    if (dto.name !== undefined || dto.position !== undefined) {
      ops.push(
        this.prisma.staffUser.update({
          where: { userId: id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.position !== undefined ? { position: dto.position } : {}),
          },
        }),
      );
    }

    if (dto.password) {
      const password = await argon2.hash(dto.password);
      ops.push(this.prisma.user.update({ where: { id }, data: { password } }));
    }

    if (dto.isAdmin !== undefined) {
      ops.push(this.prisma.user.update({ where: { id }, data: { isAdmin: dto.isAdmin } }));
    }

    // Replace-all permission set when provided.
    if (dto.permissions) {
      ops.push(this.prisma.userPermission.deleteMany({ where: { userId: id } }));
      if (dto.permissions.length > 0) {
        ops.push(
          this.prisma.userPermission.createMany({
            data: dto.permissions.map((p) => ({ userId: id, resource: p.resource, level: p.level })),
          }),
        );
      }
    }

    if (ops.length > 0) await this.prisma.$transaction(ops);

    const updated = await this.prisma.user.findUnique({
      where: { id },
      include: { staffUser: true, permissions: true },
    });
    const { password: _pw, ...safe } = updated!;
    return safe;
  }

  async deactivateUser(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async reactivateUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: { not: null }, staffUser: { isNot: null } },
    });
    if (!user) throw new NotFoundException('Deactivated user not found');
    await this.prisma.user.update({ where: { id }, data: { deletedAt: null } });
    return { success: true };
  }

  /* ════════════════ Programmes ════════════════ */
  listProgrammes() {
    return this.prisma.programme.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { subjects: true, batches: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async createProgramme(dto: CreateProgrammeDto) {
    const existing = await this.prisma.programme.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('A programme with this code already exists');
    return this.prisma.programme.create({ data: dto });
  }

  async updateProgramme(id: string, dto: UpdateProgrammeDto) {
    await this.ensureProgramme(id);
    return this.prisma.programme.update({ where: { id }, data: dto });
  }

  async deleteProgramme(id: string) {
    await this.ensureProgramme(id);
    await this.prisma.programme.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  private async ensureProgramme(id: string) {
    const p = await this.prisma.programme.findFirst({ where: { id, deletedAt: null } });
    if (!p) throw new NotFoundException('Programme not found');
    return p;
  }

  /* ════════════════ Subjects ════════════════ */
  listSubjects(programmeId?: string) {
    return this.prisma.subject.findMany({
      where: { deletedAt: null, ...(programmeId ? { programmeId } : {}) },
      include: { programme: { select: { code: true, name: true } } },
      orderBy: [{ programmeId: 'asc' }, { code: 'asc' }],
    });
  }

  async createSubject(dto: CreateSubjectDto) {
    await this.ensureProgramme(dto.programmeId);
    const existing = await this.prisma.subject.findFirst({
      where: { code: dto.code, programmeId: dto.programmeId, deletedAt: null },
    });
    if (existing) throw new ConflictException('This subject code already exists for the programme');
    return this.prisma.subject.create({ data: dto });
  }

  async updateSubject(id: string, dto: UpdateSubjectDto) {
    const s = await this.prisma.subject.findFirst({ where: { id, deletedAt: null } });
    if (!s) throw new NotFoundException('Subject not found');
    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async deleteSubject(id: string) {
    const s = await this.prisma.subject.findFirst({ where: { id, deletedAt: null } });
    if (!s) throw new NotFoundException('Subject not found');
    await this.prisma.subject.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  /* ════════════════ Batches ════════════════ */
  listBatches() {
    return this.prisma.batch.findMany({
      where: { deletedAt: null },
      include: {
        programme: { select: { code: true, name: true } },
        _count: { select: { students: true } },
      },
      orderBy: { batchNumber: 'asc' },
    });
  }

  async createBatch(dto: CreateBatchDto) {
    await this.ensureProgramme(dto.programmeId);
    const existing = await this.prisma.batch.findUnique({
      where: { batchNumber_intake: { batchNumber: dto.batchNumber, intake: dto.intake } },
    });
    if (existing) throw new ConflictException('This batch already exists for that intake');
    return this.prisma.batch.create({ data: dto });
  }

  async updateBatch(batchNumber: string, intake: string, dto: UpdateBatchDto) {
    const b = await this.prisma.batch.findUnique({
      where: { batchNumber_intake: { batchNumber, intake } },
    });
    if (!b) throw new NotFoundException('Batch not found');
    await this.ensureProgramme(dto.programmeId);
    return this.prisma.batch.update({
      where: { batchNumber_intake: { batchNumber, intake } },
      data: { programmeId: dto.programmeId },
      include: { programme: { select: { code: true, name: true } }, _count: { select: { students: true } } },
    });
  }

  async deleteBatch(batchNumber: string, intake: string) {
    const b = await this.prisma.batch.findUnique({
      where: { batchNumber_intake: { batchNumber, intake } },
    });
    if (!b) throw new NotFoundException('Batch not found');
    await this.prisma.batch.update({
      where: { batchNumber_intake: { batchNumber, intake } },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  /* ════════════════ Exam Schedules ════════════════ */
  listExamSchedules() {
    return this.prisma.examinationSchedule.findMany({
      where: { deletedAt: null },
      orderBy: { startDate: 'desc' },
    });
  }

  async createExamSchedule(dto: CreateExamScheduleDto) {
    if (dto.programmeId) await this.ensureProgramme(dto.programmeId);
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('End date cannot be before start date');
    }
    return this.prisma.examinationSchedule.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        programmeId: dto.programmeId ?? null,
        description: dto.description,
      },
    });
  }

  async updateExamSchedule(id: string, dto: UpdateExamScheduleDto) {
    const s = await this.prisma.examinationSchedule.findFirst({ where: { id, deletedAt: null } });
    if (!s) throw new NotFoundException('Schedule not found');
    return this.prisma.examinationSchedule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.programmeId ? { programmeId: dto.programmeId } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
  }

  async deleteExamSchedule(id: string) {
    const s = await this.prisma.examinationSchedule.findFirst({ where: { id, deletedAt: null } });
    if (!s) throw new NotFoundException('Schedule not found');
    await this.prisma.examinationSchedule.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  // Publish → generate (once) a stable public token and expose the view-only page.
  async publishSchedule(id: string) {
    const s = await this.prisma.examinationSchedule.findFirst({ where: { id, deletedAt: null } });
    if (!s) throw new NotFoundException('Schedule not found');
    const publicToken = s.publicToken ?? randomBytes(9).toString('base64url');
    return this.prisma.examinationSchedule.update({
      where: { id },
      data: { published: true, publishedAt: new Date(), publicToken },
    });
  }

  async unpublishSchedule(id: string) {
    const s = await this.prisma.examinationSchedule.findFirst({ where: { id, deletedAt: null } });
    if (!s) throw new NotFoundException('Schedule not found');
    return this.prisma.examinationSchedule.update({ where: { id }, data: { published: false } });
  }

  /* ════════════════ Scheduled Exams (timetable rows) ════════════════ */
  async listScheduledExams(scheduleId: string) {
    const s = await this.prisma.examinationSchedule.findFirst({ where: { id: scheduleId, deletedAt: null } });
    if (!s) throw new NotFoundException('Schedule not found');
    return this.prisma.scheduledExam.findMany({
      where: { scheduleId },
      orderBy: [{ examDate: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private scheduledExamData(dto: CreateScheduledExamDto) {
    return {
      serialCode: dto.serialCode,
      startAtLabel: dto.startAtLabel,
      examDate: dto.examDate ? new Date(dto.examDate) : null,
      weekday: dto.weekday,
      revisedDate: dto.revisedDate ? new Date(dto.revisedDate) : null,
      intake: dto.intake,
      courseCode: dto.courseCode,
      courseName: dto.courseName,
      expectedCount: dto.expectedCount != null ? Number(dto.expectedCount) : null,
      session1: dto.session1,
      session2: dto.session2,
      session3: dto.session3,
      location: dto.location,
      chiefExaminerIds: dto.chiefExaminerIds ?? [],
      supervisorIds: dto.supervisorIds ?? [],
      invigilatorIds: dto.invigilatorIds ?? [],
      supportingIds: dto.supportingIds ?? [],
      orderIndex: dto.orderIndex != null ? Number(dto.orderIndex) : 0,
    };
  }

  async createScheduledExam(scheduleId: string, dto: CreateScheduledExamDto) {
    const s = await this.prisma.examinationSchedule.findFirst({ where: { id: scheduleId, deletedAt: null } });
    if (!s) throw new NotFoundException('Schedule not found');
    return this.prisma.scheduledExam.create({
      data: { scheduleId, ...this.scheduledExamData(dto) },
    });
  }

  async updateScheduledExam(id: string, dto: UpdateScheduledExamDto) {
    const e = await this.prisma.scheduledExam.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Exam not found');
    // Only overwrite fields that were provided.
    const data: any = {};
    const src = this.scheduledExamData(dto);
    for (const key of Object.keys(dto)) {
      if (key in src) data[key] = (src as any)[key];
    }
    return this.prisma.scheduledExam.update({ where: { id }, data });
  }

  async deleteScheduledExam(id: string) {
    const e = await this.prisma.scheduledExam.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Exam not found');
    await this.prisma.scheduledExam.delete({ where: { id } });
    return { success: true };
  }

  // Bulk-import a timetable from an ESE-format Excel file. Staff named in the
  // sheet are matched to the directory by (role, name) and created if missing.
  async importScheduledExams(scheduleId: string, buffer?: Buffer, replace = false) {
    if (!buffer) throw new BadRequestException('No file uploaded');
    const schedule = await this.prisma.examinationSchedule.findFirst({ where: { id: scheduleId, deletedAt: null } });
    if (!schedule) throw new NotFoundException('Schedule not found');

    const { rows } = parseExamScheduleWorkbook(buffer);
    if (rows.length === 0) throw new BadRequestException('No exam rows found in the file');

    // Cache of directory staff keyed by role + lower-cased name.
    const existing = await this.prisma.examStaff.findMany({ where: { deletedAt: null } });
    const key = (role: string, name: string) => `${role}::${name.trim().toLowerCase()}`;
    const staffMap = new Map(existing.map((s) => [key(s.role, s.name), s.id]));
    let staffCreated = 0;

    const resolve = async (role: string, names: string[]): Promise<string[]> => {
      const ids: string[] = [];
      for (const n of names) {
        const k = key(role, n);
        let id = staffMap.get(k);
        if (!id) {
          const created = await this.prisma.examStaff.create({ data: { name: n, role } });
          id = created.id;
          staffMap.set(k, id);
          staffCreated += 1;
        }
        ids.push(id);
      }
      return ids;
    };

    if (replace) {
      await this.prisma.scheduledExam.deleteMany({ where: { scheduleId } });
    }

    let order = 0;
    let created = 0;
    for (const r of rows) {
      const [chiefExaminerIds, supervisorIds, invigilatorIds, supportingIds] = await Promise.all([
        resolve('EXAMINER', r.chiefExaminers),
        resolve('SUPERVISOR', r.supervisors),
        resolve('INVIGILATOR', r.invigilators),
        resolve('SUPPORTING', r.supporting),
      ]);
      const weekday =
        r.weekday ||
        (r.examDate ? r.examDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }) : undefined);
      await this.prisma.scheduledExam.create({
        data: {
          scheduleId,
          orderIndex: order++,
          serialCode: r.serialCode,
          startAtLabel: r.startAtLabel,
          examDate: r.examDate ?? undefined,
          weekday,
          revisedDate: r.revisedDate ?? undefined,
          intake: r.intake,
          courseCode: r.courseCode,
          courseName: r.courseName,
          expectedCount: r.expectedCount ?? undefined,
          session1: r.session1,
          session2: r.session2,
          session3: r.session3,
          location: r.location,
          chiefExaminerIds,
          supervisorIds,
          invigilatorIds,
          supportingIds,
        },
      });
      created += 1;
    }

    return { created, staffCreated, total: rows.length };
  }

  /* ════════════════ Exam Staff directory ════════════════ */
  listExamStaff(role?: string) {
    return this.prisma.examStaff.findMany({
      where: { deletedAt: null, ...(role ? { role } : {}) },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  createExamStaff(dto: CreateExamStaffDto) {
    return this.prisma.examStaff.create({
      data: {
        name: dto.name,
        role: dto.role,
        phone: dto.phone,
        email: dto.email,
        note: dto.note,
        active: dto.active ?? true,
      },
    });
  }

  async updateExamStaff(id: string, dto: UpdateExamStaffDto) {
    const s = await this.prisma.examStaff.findFirst({ where: { id, deletedAt: null } });
    if (!s) throw new NotFoundException('Staff not found');
    return this.prisma.examStaff.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async deleteExamStaff(id: string) {
    const s = await this.prisma.examStaff.findFirst({ where: { id, deletedAt: null } });
    if (!s) throw new NotFoundException('Staff not found');
    await this.prisma.examStaff.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  /* ════════════════ Exam Locations directory ════════════════ */
  listExamLocations() {
    return this.prisma.examLocation.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  createExamLocation(dto: CreateExamLocationDto) {
    return this.prisma.examLocation.create({
      data: {
        name: dto.name,
        capacity: dto.capacity != null ? Number(dto.capacity) : null,
        note: dto.note,
        active: dto.active ?? true,
      },
    });
  }

  async updateExamLocation(id: string, dto: UpdateExamLocationDto) {
    const l = await this.prisma.examLocation.findFirst({ where: { id, deletedAt: null } });
    if (!l) throw new NotFoundException('Location not found');
    return this.prisma.examLocation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity != null ? Number(dto.capacity) : null } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async deleteExamLocation(id: string) {
    const l = await this.prisma.examLocation.findFirst({ where: { id, deletedAt: null } });
    if (!l) throw new NotFoundException('Location not found');
    await this.prisma.examLocation.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  /* ════════════════ Students (list) ════════════════ */
  async listStudents(search?: string, take = 50, skip = 0, batchNumber?: string, intake?: string) {
    const where: any = { deletedAt: null };
    if (batchNumber) where.batchNumber = batchNumber;
    if (intake) where.intake = intake;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
        { nic: { contains: search, mode: 'insensitive' } },
        { intake: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        take: Math.min(take, 200),
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, registrationNumber: true, nic: true, fullName: true,
          nameWithInitials: true, title: true, gender: true, email: true,
          mobile: true, telephone: true, permanentAddress: true, postalAddress: true,
          batchNumber: true, intake: true,
        },
      }),
      this.prisma.student.count({ where }),
    ]);
    return { items, total };
  }

  /* ════════════════ Students (CRUD) ════════════════ */
  // Ensure the Programme + Batch a student references exist (composite FK).
  private async ensureBatchFor(reg: string, batchNumber: string, intake: string) {
    const code = programmeCodeOf(reg);
    const prog = await this.prisma.programme.upsert({
      where: { code },
      update: {},
      create: { code, name: PROGRAMME_NAMES[code] || code },
    });
    await this.prisma.batch.upsert({
      where: { batchNumber_intake: { batchNumber, intake } },
      update: {},
      create: { batchNumber, intake, programmeId: prog.id },
    });
  }

  async createStudent(dto: CreateStudentDto) {
    const existing = await this.prisma.student.findUnique({
      where: { registrationNumber: dto.registrationNumber },
    });
    if (existing) throw new ConflictException('A student with this registration number already exists');

    const intake = dto.intake?.trim() || deriveIntake(dto.registrationNumber);
    const batchNumber = dto.batchNumber?.trim() || intake;
    await this.ensureBatchFor(dto.registrationNumber, batchNumber, intake);

    return this.prisma.student.create({
      data: {
        registrationNumber: dto.registrationNumber,
        nic: dto.nic,
        fullName: dto.fullName,
        nameWithInitials: dto.nameWithInitials,
        title: dto.title,
        gender: dto.gender,
        email: dto.email,
        mobile: dto.mobile,
        telephone: dto.telephone,
        permanentAddress: dto.permanentAddress,
        postalAddress: dto.postalAddress,
        batchNumber,
        intake,
      },
    });
  }

  async updateStudent(id: string, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findFirst({ where: { id, deletedAt: null } });
    if (!student) throw new NotFoundException('Student not found');

    const batchNumber = dto.batchNumber?.trim() ?? student.batchNumber;
    const intake = dto.intake?.trim() ?? student.intake;
    if (batchNumber !== student.batchNumber || intake !== student.intake) {
      await this.ensureBatchFor(student.registrationNumber, batchNumber, intake);
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        ...(dto.nic !== undefined ? { nic: dto.nic } : {}),
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.nameWithInitials !== undefined ? { nameWithInitials: dto.nameWithInitials } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.mobile !== undefined ? { mobile: dto.mobile } : {}),
        ...(dto.telephone !== undefined ? { telephone: dto.telephone } : {}),
        ...(dto.permanentAddress !== undefined ? { permanentAddress: dto.permanentAddress } : {}),
        ...(dto.postalAddress !== undefined ? { postalAddress: dto.postalAddress } : {}),
        batchNumber,
        intake,
      },
    });
  }

  async deleteStudent(id: string) {
    const student = await this.prisma.student.findFirst({ where: { id, deletedAt: null } });
    if (!student) throw new NotFoundException('Student not found');
    await this.prisma.student.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  /* ════════════════ Student Import ════════════════ */
  async importStudents(buffer: Buffer | undefined, dryRun: boolean) {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('No file uploaded');
    }

    let parsed: { students: ParsedStudent[]; skipped: number };
    try {
      parsed = parseStudentWorkbook(buffer);
    } catch {
      throw new BadRequestException('Could not read the spreadsheet. Upload a valid .xls/.xlsx file.');
    }

    const { students, skipped } = parsed;
    if (students.length === 0) {
      throw new BadRequestException('No student rows found in the file');
    }

    // 1. De-dupe by registration number (last occurrence wins).
    const byReg = new Map<string, ParsedStudent>();
    for (const s of students) byReg.set(s.registrationNumber, s);
    const duplicateRegNumbers = students.length - byReg.size;

    // 2. Collapse the same person appearing under multiple registration numbers
    //    in the same intake (same NIC + batchNumber + intake). The DB enforces
    //    one student per [batchNumber, nic, intake], so the first record wins.
    const seenComposite = new Set<string>();
    const unique: ParsedStudent[] = [];
    let mergedDuplicatePersons = 0;
    for (const s of byReg.values()) {
      const ck = s.nic ? `${s.batchNumber}|${s.nic}|${s.intake}` : null;
      if (ck && seenComposite.has(ck)) { mergedDuplicatePersons++; continue; }
      if (ck) seenComposite.add(ck);
      unique.push(s);
    }

    // Which of the surviving records already exist?
    const existing = await this.prisma.student.findMany({
      where: { registrationNumber: { in: unique.map((s) => s.registrationNumber) } },
      select: { registrationNumber: true },
    });
    const existingSet = new Set(existing.map((e) => e.registrationNumber));

    const willCreate = unique.filter((s) => !existingSet.has(s.registrationNumber)).length;

    const summary = {
      total: students.length,
      toImport: unique.length,
      willCreate,
      willUpdate: unique.length - willCreate,
      skipped,
      duplicateRegNumbers,
      mergedDuplicatePersons,
      sample: unique.slice(0, 10).map((s) => ({
        registrationNumber: s.registrationNumber,
        fullName: s.fullName,
        nic: s.nic,
        intake: s.intake,
      })),
    };

    if (dryRun) {
      return { dryRun: true, ...summary };
    }

    // Student.batchNumber+intake is a composite FK to Batch, so the referenced
    // Batch rows must exist first. We derive a programme from the registration
    // prefix and ensure a Batch per distinct (batchNumber, intake).
    const PROG_NAMES: Record<string, string> = {
      BAA: 'BSc Applied Accounting',
      BMBA: 'Bachelor of Management (Business Analytics)',
      BSC: 'BSc Degree',
      SAB: 'SAB (Legacy)',
      SPE: 'Special Programme',
      GEN: 'General Programme',
      OTHER: 'Other / Legacy',
    };
    const prefixOf = (reg: string) => {
      const segs = reg.split('/');
      return segs.length > 1 ? segs[0].toUpperCase() : 'OTHER';
    };

    // 1. Ensure a programme per distinct prefix.
    const progIdByCode = new Map<string, string>();
    for (const code of new Set(unique.map((s) => prefixOf(s.registrationNumber)))) {
      const prog = await this.prisma.programme.upsert({
        where: { code },
        update: {},
        create: { code, name: PROG_NAMES[code] || code },
      });
      progIdByCode.set(code, prog.id);
    }

    // 2. Ensure a batch per distinct (batchNumber, intake).
    const batchProg = new Map<string, string>(); // "batchNumber intake" -> programmeId
    for (const s of unique) {
      const key = `${s.batchNumber} ${s.intake}`;
      if (!batchProg.has(key)) batchProg.set(key, progIdByCode.get(prefixOf(s.registrationNumber))!);
    }
    const batchEntries = Array.from(batchProg.entries());
    for (let i = 0; i < batchEntries.length; i += 100) {
      await Promise.allSettled(
        batchEntries.slice(i, i + 100).map(([key, programmeId]) => {
          const [batchNumber, intake] = key.split(' ');
          return this.prisma.batch.upsert({
            where: { batchNumber_intake: { batchNumber, intake } },
            update: {},
            create: { batchNumber, intake, programmeId },
          });
        }),
      );
    }

    let created = 0;
    let updated = 0;
    const errors: { registrationNumber: string; message: string }[] = [];
    const CHUNK = 100;

    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      const results = await Promise.allSettled(
        chunk.map((s) =>
          this.prisma.student.upsert({
            where: { registrationNumber: s.registrationNumber },
            update: {
              nic: s.nic,
              fullName: s.fullName,
              title: s.title,
              gender: s.gender,
              email: s.email,
              mobile: s.mobile,
              intake: s.intake,
              batchNumber: s.batchNumber,
            },
            create: {
              registrationNumber: s.registrationNumber,
              nic: s.nic,
              fullName: s.fullName,
              title: s.title,
              gender: s.gender,
              email: s.email,
              mobile: s.mobile,
              intake: s.intake,
              batchNumber: s.batchNumber,
            },
          }),
        ),
      );
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          existingSet.has(chunk[idx].registrationNumber) ? updated++ : created++;
        } else {
          errors.push({
            registrationNumber: chunk[idx].registrationNumber,
            message: (res.reason as Error)?.message?.slice(0, 200) || 'Unknown error',
          });
        }
      });
    }

    return {
      dryRun: false,
      total: students.length,
      imported: unique.length,
      created,
      updated,
      skipped,
      duplicateRegNumbers,
      mergedDuplicatePersons,
      failed: errors.length,
      errors: errors.slice(0, 20),
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateStaffUserDto,
  UpdateStaffUserDto,
  CreateProgrammeDto,
  UpdateProgrammeDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  CreateBatchDto,
  CreateExamScheduleDto,
  UpdateExamScheduleDto,
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

  /* ════════════════ Users ════════════════ */
  async listRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, staffUser: { isNot: null } },
      include: {
        staffUser: true,
        roles: { include: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Never leak password hashes.
    return users.map(({ password, ...u }) => u);
  }

  async createStaffUser(dto: CreateStaffUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const roleRecords = await this.prisma.role.findMany({
      where: { name: { in: dto.roles } },
    });
    if (roleRecords.length === 0) {
      throw new BadRequestException('At least one valid role is required');
    }

    const password = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password,
        staffUser: { create: { name: dto.name, position: dto.position } },
        roles: { create: roleRecords.map((r) => ({ roleId: r.id })) },
      },
      include: { staffUser: true, roles: { include: { role: true } } },
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

    if (dto.roles) {
      const roleRecords = await this.prisma.role.findMany({ where: { name: { in: dto.roles } } });
      ops.push(this.prisma.userRole.deleteMany({ where: { userId: id } }));
      ops.push(
        this.prisma.userRole.createMany({
          data: roleRecords.map((r) => ({ userId: id, roleId: r.id })),
        }),
      );
    }

    if (ops.length > 0) await this.prisma.$transaction(ops);

    const updated = await this.prisma.user.findUnique({
      where: { id },
      include: { staffUser: true, roles: { include: { role: true } } },
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
    await this.ensureProgramme(dto.programmeId);
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('End date cannot be before start date');
    }
    return this.prisma.examinationSchedule.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        programmeId: dto.programmeId,
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

  /* ════════════════ Students (list) ════════════════ */
  async listStudents(search?: string, take = 50, skip = 0) {
    const where: any = { deletedAt: null };
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

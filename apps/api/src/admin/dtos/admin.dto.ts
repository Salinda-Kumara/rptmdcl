import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/* ──────────────── Users & Permissions ──────────────── */
export enum PermissionLevel {
  VIEW = 'VIEW',
  FULL = 'FULL',
}

export class PermissionGrantDto {
  @IsString()
  @IsNotEmpty()
  resource: string;

  @IsEnum(PermissionLevel)
  level: PermissionLevel;
}

export class CreateStaffUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionGrantDto)
  permissions?: PermissionGrantDto[];
}

export class UpdateStaffUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionGrantDto)
  permissions?: PermissionGrantDto[];
}

/* ──────────────── Programmes ──────────────── */
export class CreateProgrammeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProgrammeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

/* ──────────────── Subjects ──────────────── */
export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  programmeId: string;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

/* ──────────────── Batches ──────────────── */
export class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @IsString()
  @IsNotEmpty()
  intake: string;

  @IsString()
  @IsNotEmpty()
  programmeId: string;
}

export class UpdateBatchDto {
  @IsString()
  @IsNotEmpty()
  programmeId: string;
}

/* ──────────────── Students ──────────────── */
export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @IsString()
  @IsNotEmpty()
  nic: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional() @IsString() nameWithInitials?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() telephone?: string;
  @IsOptional() @IsString() permanentAddress?: string;
  @IsOptional() @IsString() postalAddress?: string;
  @IsOptional() @IsString() batchNumber?: string; // derived from reg-no if omitted
  @IsOptional() @IsString() intake?: string; // derived from reg-no if omitted
}

export class UpdateStudentDto {
  @IsOptional() @IsString() nic?: string;
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() nameWithInitials?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() telephone?: string;
  @IsOptional() @IsString() permanentAddress?: string;
  @IsOptional() @IsString() postalAddress?: string;
  @IsOptional() @IsString() batchNumber?: string;
  @IsOptional() @IsString() intake?: string;
}

/* ──────────────── Exam Schedules ──────────────── */
export class CreateExamScheduleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  programmeId?: string; // optional — a schedule can span programmes

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateExamScheduleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  programmeId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

/* ──────────────── Exam Staff (duty directory) ──────────────── */
export enum ExamStaffRole {
  EXAMINER = 'EXAMINER',
  SUPERVISOR = 'SUPERVISOR',
  INVIGILATOR = 'INVIGILATOR',
  SUPPORTING = 'SUPPORTING',
  OTHER = 'OTHER',
}

export class CreateExamStaffDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ExamStaffRole)
  role: ExamStaffRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateExamStaffDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ExamStaffRole)
  role?: ExamStaffRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/* ──────────────── Scheduled Exam (timetable row) ──────────────── */
export class CreateScheduledExamDto {
  @IsOptional()
  @IsString()
  serialCode?: string;

  @IsOptional()
  @IsString()
  startAtLabel?: string;

  @IsOptional()
  @IsDateString()
  examDate?: string;

  @IsOptional()
  @IsString()
  weekday?: string;

  @IsOptional()
  @IsDateString()
  revisedDate?: string;

  @IsOptional()
  @IsString()
  intake?: string;

  @IsOptional()
  @IsString()
  courseCode?: string;

  @IsOptional()
  @IsString()
  courseName?: string;

  @IsOptional()
  expectedCount?: number;

  @IsOptional()
  @IsString()
  session1?: string;

  @IsOptional()
  @IsString()
  session2?: string;

  @IsOptional()
  @IsString()
  session3?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chiefExaminerIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supervisorIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  invigilatorIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportingIds?: string[];

  @IsOptional()
  orderIndex?: number;
}

// Same shape — all fields optional for a partial update.
export class UpdateScheduledExamDto extends CreateScheduledExamDto {}

/* ──────────────── Exam Locations (venue directory) ──────────────── */
export class CreateExamLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  capacity?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateExamLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  capacity?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

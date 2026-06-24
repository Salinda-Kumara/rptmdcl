import {
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/* ──────────────── Users ──────────────── */
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

  @IsArray()
  @IsString({ each: true })
  roles: string[]; // role names, e.g. ['FINANCE_OFFICER']
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
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
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

  @IsString()
  @IsNotEmpty()
  programmeId: string;

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

import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ApplicationType {
  MEDICAL = 'MEDICAL',
  REPEAT = 'REPEAT',
}

export enum SubjectCategory {
  MEDICAL = 'MEDICAL',
  REPEAT = 'REPEAT',
  FIRST_ATTEMPT = '1ST_ATTEMPT',
}

export class PreviousExamDto {
  @IsOptional()
  @IsDateString()
  previousExamDate?: string;

  @IsOptional()
  @IsString()
  previousExamIntake?: string;

  @IsOptional()
  @IsString()
  gradeEarned?: string;
}

export class ApplicationSubjectDto {
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsEnum(SubjectCategory)
  category: SubjectCategory;

  @IsNumber()
  @Min(0)
  @Max(100)
  caMarks: number; // Mandatory per the physical form

  @IsOptional()
  @IsString()
  upcomingExamIntake?: string; // e.g. "2024-06"

  @IsOptional()
  @IsDateString()
  upcomingExamDate?: string; // auto-filled from ExaminationSchedule

  @IsOptional()
  @IsDateString()
  previousExamDate?: string;

  @IsOptional()
  @IsString()
  previousExamIntake?: string;

  @IsOptional()
  @IsString()
  gradeEarned?: string; // For repeat applications
}

// Personal details the student may verify/correct on the application form.
// All fields are editable for this application only; the Student master record
// is never modified.
export class ApplicantDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  nameWithInitials?: string;

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  postalAddress?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  nic?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  intake?: string;
}

export class CreateApplicationDto {
  // Optional — the application type is derived server-side from the subject
  // categories (any Medical subject → MEDICAL, otherwise REPEAT).
  @IsOptional()
  @IsEnum(ApplicationType)
  type?: ApplicationType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationSubjectDto)
  subjects: ApplicationSubjectDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ApplicantDto)
  applicant?: ApplicantDto;
}

export class SubmitApplicationDto {
  @IsString()
  @IsNotEmpty()
  paymentReferenceId: string;
}

export enum ReviewAction {
  FORWARD = 'FORWARD', // pass data-validity check → send to finance for payment verification
  REJECT = 'REJECT', // reject the whole application (remark required)
  RETURN = 'RETURN', // return to the student to correct and resubmit (remark required)
}

export class ReviewActionDto {
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @IsOptional()
  @IsString()
  remark?: string;
}

// Exam Division: decline a single subject on an application while forwarding the
// rest. A reason is required and recorded against the subject.
export class DeclineSubjectDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

// Student: the editable fields when correcting a RETURNED application. The set
// of subjects and their categories are fixed (they determine the paid fee); only
// the data fields flagged for correction may change, matched by subject-row id.
export class ResubmitSubjectDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  caMarks?: number;

  @IsOptional()
  @IsString()
  upcomingExamIntake?: string;

  @IsOptional()
  @IsDateString()
  upcomingExamDate?: string;

  @IsOptional()
  @IsDateString()
  previousExamDate?: string;

  @IsOptional()
  @IsString()
  previousExamIntake?: string;

  @IsOptional()
  @IsString()
  gradeEarned?: string;
}

export class ResubmitApplicationDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ApplicantDto)
  applicant?: ApplicantDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResubmitSubjectDto)
  subjects?: ResubmitSubjectDto[];
}

// Stage 2 — Finance payment verification.
export enum PaymentReviewAction {
  APPROVE = 'APPROVE', // payment confirmed → status APPROVED (finance is the final stage)
  REJECT = 'REJECT', // payment rejected (remark required) → status PAYMENT_REJECTED
}

export class PaymentReviewDto {
  @IsEnum(PaymentReviewAction)
  action: PaymentReviewAction;

  @IsOptional()
  @IsString()
  remark?: string;
}

// Stage 3 — Exam Registrar final approval. Approving is the only action; an
// optional remark may be recorded alongside it.
export class FinalApprovalDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

// Stage 3 — Exam Registrar rejects a payment-verified application (remark required).
export class FinalRejectDto {
  @IsString()
  @IsNotEmpty()
  remark: string;
}

// Stage 3 — Exam Registrar approves several applications at once.
export class BulkApproveDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @IsOptional()
  @IsString()
  remark?: string;
}

// Roll an application back one stage (e.g. a wrongly-accepted application).
// The acting user must re-enter their password to confirm this destructive action.
export class RollbackDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

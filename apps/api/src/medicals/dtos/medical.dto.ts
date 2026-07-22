import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// One "Date / Subject" row — a scheduled exam the student was absent on.
export class MedicalItemDto {
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsDateString()
  examDate: string;
}

export class CreateMedicalSubmissionDto {
  @IsInt()
  @Min(1)
  @Max(365)
  totalDays: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalItemDto)
  items: MedicalItemDto[];

  // Contact corrections snapshotted onto the form (identity comes from the
  // student record server-side).
  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  contactNumbers?: string;
}

export enum MedicalReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class MedicalReviewDto {
  @IsEnum(MedicalReviewAction)
  action: MedicalReviewAction;

  @IsOptional()
  @IsString()
  remark?: string;
}

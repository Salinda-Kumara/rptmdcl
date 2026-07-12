import { IsOptional, IsString } from 'class-validator';

// The only student-editable master-record fields. Everything else on an
// application is a per-application snapshot and never written back.
export class UpdateContactDto {
  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

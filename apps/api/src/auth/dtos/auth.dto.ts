import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class StudentLoginDto {
  @IsNotEmpty()
  @IsString()
  batchNumber: string;

  @IsNotEmpty()
  @IsString()
  nic: string;
}

export class StaffLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

// ── Staff password reset (OTP) ──
export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyResetOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  otp: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  resetToken: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

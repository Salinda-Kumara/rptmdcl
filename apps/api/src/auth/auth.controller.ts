import { Body, Controller, Post, UseGuards, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  StudentLoginDto, StaffLoginDto, AuthResponseDto, RefreshTokenDto,
  ForgotPasswordDto, VerifyResetOtpDto, ResetPasswordDto,
} from './dtos/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { effectivePermissions } from './permissions';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('student/login')
  @ApiOperation({ summary: 'Student login using batch number and NIC' })
  async studentLogin(@Body() studentLoginDto: StudentLoginDto): Promise<AuthResponseDto> {
    return this.authService.studentLogin(studentLoginDto);
  }

  @Get('batches')
  @ApiOperation({ summary: 'Get list of available batches for student login' })
  async getBatches(): Promise<string[]> {
    return this.authService.getBatches();
  }

  @Post('staff/login')
  @ApiOperation({ summary: 'Staff login using email and password' })
  async staffLogin(@Body() staffLoginDto: StaffLoginDto): Promise<AuthResponseDto> {
    return this.authService.staffLogin(staffLoginDto);
  }

  // Staff password reset — OTP emailed to the account, verified, then
  // exchanged for a short-lived token used to set the new password.
  @Post('staff/forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Staff: request a password-reset OTP by email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('staff/verify-reset-otp')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Staff: verify the password-reset OTP' })
  async verifyResetOtp(@Body() dto: VerifyResetOtpDto) {
    return this.authService.verifyResetOtp(dto.email, dto.otp);
  }

  @Post('staff/reset-password')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Staff: set a new password using a verified reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.resetToken, dto.newPassword);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Req() req: any) {
    return {
      user: req.user,
      isAdmin: !!req.user?.isAdmin,
      permissions: effectivePermissions(req.user),
    };
  }
}

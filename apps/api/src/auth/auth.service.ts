import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '@/prisma/prisma.service';
import { MailService } from '@/mail/mail.service';
import { StudentLoginDto, StaffLoginDto, AuthResponseDto } from './dtos/auth.dto';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const RESET_TOKEN_PURPOSE = 'password-reset';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async getBatches(): Promise<string[]> {
    const batches = await this.prisma.batch.findMany({
      select: { batchNumber: true },
      distinct: ['batchNumber'],
      orderBy: { batchNumber: 'desc' },
    });
    return batches.map(b => b.batchNumber);
  }

  async studentLogin(studentLoginDto: StudentLoginDto): Promise<AuthResponseDto> {
    const { batchNumber, nic } = studentLoginDto;

    const student = await this.prisma.student.findFirst({
      where: {
        batchNumber,
        nic,
      },
      include: { user: true },
    });

    if (!student) {
      throw new UnauthorizedException('Invalid batch number or NIC');
    }

    let user = student.user;

    // Create the user account on first login. Student identity is implied by the
    // `student` relation — no role assignment needed under PBAC.
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: student.email || `${student.batchNumber.replace(/\s+/g, '')}-${student.nic}@student.local`.toLowerCase(),
          password: null,
          student: { connect: { id: student.id } },
        },
      });
    }

    return this.generateAuthTokens(user, student.fullName);
  }

  async staffLogin(staffLoginDto: StaffLoginDto): Promise<AuthResponseDto> {
    const { email, password } = staffLoginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { staffUser: true },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateAuthTokens(user, user.staffUser?.name);
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const accessToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
        },
        {
          secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
          expiresIn: parseInt(process.env.JWT_EXPIRATION || '3600', 10),
        },
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // Step 1 — email a 6-digit OTP to a staff account. Always resolves the same
  // way regardless of whether the email matches an account, to avoid leaking
  // which addresses are registered.
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const GENERIC = { message: 'If that email is registered, a reset code has been sent.' };

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { staffUser: true },
    });

    // Only staff accounts (password-based login) are eligible — students log
    // in with batch/NIC and have no password to reset.
    if (!user || !user.password || !user.staffUser || user.deletedAt) {
      return GENERIC;
    }

    // Invalidate any earlier unused codes for this user before issuing a new one.
    await this.prisma.passwordResetOtp.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await argon2.hash(code);

    await this.prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await this.mailService.sendPasswordResetOtp(user.email, code, user.staffUser.name);
    return GENERIC;
  }

  // Step 2 — verify the OTP and exchange it for a short-lived reset token.
  async verifyResetOtp(email: string, otp: string): Promise<{ resetToken: string }> {
    const invalid = () => new BadRequestException('Invalid or expired code. Please request a new one.');

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw invalid();

    const record = await this.prisma.passwordResetOtp.findFirst({
      where: { userId: user.id, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw invalid();

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many incorrect attempts. Please request a new code.');
    }

    const correct = await argon2.verify(record.codeHash, otp);
    if (!correct) {
      await this.prisma.passwordResetOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Incorrect code. Please try again.');
    }

    await this.prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { verified: true },
    });

    const resetToken = this.jwtService.sign(
      { sub: user.id, otpId: record.id, purpose: RESET_TOKEN_PURPOSE },
      { secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production', expiresIn: '10m' },
    );
    return { resetToken };
  }

  // Step 3 — consume the reset token exactly once to set a new password.
  async resetPassword(resetToken: string, newPassword: string): Promise<{ message: string }> {
    let payload: any;
    try {
      payload = this.jwtService.verify(resetToken, {
        secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
      });
    } catch {
      throw new UnauthorizedException('This reset link has expired. Please start again.');
    }
    if (payload.purpose !== RESET_TOKEN_PURPOSE) {
      throw new UnauthorizedException('This reset link has expired. Please start again.');
    }

    const record = await this.prisma.passwordResetOtp.findFirst({
      where: {
        id: payload.otpId,
        userId: payload.sub,
        verified: true,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) {
      throw new UnauthorizedException('This reset link has already been used or has expired. Please start again.');
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: payload.sub }, data: { password: passwordHash } }),
      this.prisma.passwordResetOtp.update({ where: { id: record.id }, data: { used: true } }),
    ]);

    return { message: 'Password updated successfully. You can now log in.' };
  }

  private generateAuthTokens(user: any, userName?: string) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
      expiresIn: parseInt(process.env.JWT_EXPIRATION || '3600', 10),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
      expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRATION || '604800', 10),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: userName,
      },
    };
  }
}

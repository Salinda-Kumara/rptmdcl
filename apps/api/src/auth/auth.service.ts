import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentLoginDto, StaffLoginDto, AuthResponseDto } from './dtos/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async studentLogin(studentLoginDto: StudentLoginDto): Promise<AuthResponseDto> {
    const { batchNumber, nic } = studentLoginDto;

    const student = await this.prisma.student.findFirst({
      where: {
        batchNumber,
        nic,
      },
      include: {
        user: {
          include: {
            roles: { include: { role: true } },
          },
        },
      },
    });

    if (!student) {
      throw new UnauthorizedException('Invalid batch number or NIC');
    }

    let user = student.user;

    // Create user account if doesn't exist
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: student.email,
          password: null,
          student: {
            connect: {
              id: student.id,
            },
          },
        },
        include: {
          roles: { include: { role: true } },
        },
      });

      // Assign student role if not exists
      const studentRole = await this.prisma.role.findUnique({
        where: { name: 'STUDENT' },
      });

      if (studentRole) {
        await this.prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: studentRole.id,
          },
        });
      }
    }

    return this.generateAuthTokens(user, student.fullName);
  }

  async staffLogin(staffLoginDto: StaffLoginDto): Promise<AuthResponseDto> {
    const { email, password } = staffLoginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        staffUser: true,
      },
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

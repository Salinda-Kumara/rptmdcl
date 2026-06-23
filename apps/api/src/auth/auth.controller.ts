import { Body, Controller, Post, UseGuards, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { StudentLoginDto, StaffLoginDto, AuthResponseDto, RefreshTokenDto } from './dtos/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('student/login')
  @ApiOperation({ summary: 'Student login using batch number and NIC' })
  async studentLogin(@Body() studentLoginDto: StudentLoginDto): Promise<AuthResponseDto> {
    return this.authService.studentLogin(studentLoginDto);
  }

  @Post('staff/login')
  @ApiOperation({ summary: 'Staff login using email and password' })
  async staffLogin(@Body() staffLoginDto: StaffLoginDto): Promise<AuthResponseDto> {
    return this.authService.staffLogin(staffLoginDto);
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
    };
  }
}

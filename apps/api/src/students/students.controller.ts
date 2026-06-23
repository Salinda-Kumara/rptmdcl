import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { StudentsService } from './students.service';

@ApiTags('Students')
@Controller('students')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get student profile' })
  getProfile(@Req() req: any) {
    return this.studentsService.getProfile(req.user.id);
  }

  @Get('subjects')
  @ApiOperation({ summary: 'Get subjects for student programme' })
  getSubjects(@Req() req: any) {
    return this.studentsService.getSubjects(req.user.id);
  }
}

import { Body, Controller, Get, Patch, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { StudentsService } from './students.service';
import { UpdateContactDto } from './dtos/update-contact.dto';

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

  @Patch('profile/contact')
  @ApiOperation({ summary: 'Update own permanent address, mobile and email' })
  updateContact(@Req() req: any, @Body() dto: UpdateContactDto) {
    return this.studentsService.updateContact(req.user.id, dto);
  }

  @Get('subjects')
  @ApiOperation({ summary: 'Get subjects for student programme' })
  getSubjects(@Req() req: any) {
    return this.studentsService.getSubjects(req.user.id);
  }

  @Get('exam-schedules')
  @ApiOperation({ summary: 'Get upcoming exam schedules for student programme' })
  getExamSchedules(@Req() req: any) {
    return this.studentsService.getExamSchedules(req.user.id);
  }

  @Get('scheduled-exams')
  @ApiOperation({ summary: 'Published timetable rows (course code → date/intake) for subject auto-fill' })
  getScheduledExams(@Req() req: any) {
    return this.studentsService.getScheduledExams(req.user.id);
  }
}

import {
  Body, Controller, Get, Param, Patch, Post, Query, Req,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermission } from '@/auth/decorators/require-permission.decorator';
import { MedicalsService } from './medicals.service';
import { CreateMedicalSubmissionDto, MedicalReviewDto } from './dtos/medical.dto';
import { MAX_FILE_SIZE } from '@/documents/documents.constants';

@ApiTags('Medical Submissions')
@Controller('medicals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MedicalsController {
  constructor(private medicalsService: MedicalsService) {}

  /* ── Student ── */

  @Get('my/eligible-exams')
  @ApiOperation({ summary: 'Scheduled exams inside the 15-day medical submission window (student)' })
  eligibleExams(@Req() req: any) {
    return this.medicalsService.eligibleExams(req.user.id);
  }

  @Get('my/approved-available')
  @ApiOperation({ summary: 'Approved, unused medical absences for exam-application auto-fill (student)' })
  approvedAvailable(@Req() req: any) {
    return this.medicalsService.approvedAvailable(req.user.id);
  }

  @Get('my')
  @ApiOperation({ summary: 'List my medical submissions (student)' })
  listMine(@Req() req: any) {
    return this.medicalsService.listMine(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a medical submission draft (student)' })
  create(@Req() req: any, @Body() dto: CreateMedicalSubmissionDto) {
    return this.medicalsService.create(req.user.id, dto);
  }

  @Post('my/:id/certificate')
  @ApiOperation({ summary: 'Upload the medical certificate (student, before submit)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  uploadCertificate(@Req() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.medicalsService.uploadCertificate(req.user.id, id, file);
  }

  @Patch('my/:id/submit')
  @ApiOperation({ summary: 'Submit the medical application for review (student)' })
  submit(@Req() req: any, @Param('id') id: string) {
    return this.medicalsService.submit(req.user.id, id);
  }

  /* ── Staff (Exam Verification Officer) ── */

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission('medicals', 'VIEW')
  @ApiOperation({ summary: 'List medical submissions (staff)' })
  @ApiQuery({ name: 'status', required: false })
  listStaff(@Query('status') status?: string) {
    return this.medicalsService.listStaff(status);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('medicals', 'VIEW')
  @ApiOperation({ summary: 'Get a medical submission (staff)' })
  findOne(@Param('id') id: string) {
    return this.medicalsService.findOneStaff(id);
  }

  @Patch(':id/review')
  @UseGuards(PermissionsGuard)
  @RequirePermission('medicals', 'FULL')
  @ApiOperation({ summary: 'Approve (assigns the Medical Verification Serial) or reject (staff)' })
  review(@Req() req: any, @Param('id') id: string, @Body() dto: MedicalReviewDto) {
    return this.medicalsService.review(req.user, id, dto);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermission } from '@/auth/decorators/require-permission.decorator';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto, SubmitApplicationDto, ReviewActionDto, PaymentReviewDto, RollbackDto, FinalApprovalDto, FinalRejectDto, BulkApproveDto, DeclineSubjectDto, ResubmitApplicationDto } from './dtos/application.dto';

@ApiTags('Applications')
@Controller('applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private applicationsService: ApplicationsService) {}

  // Student endpoints
  @Post()
  @ApiOperation({ summary: 'Create a new application (student)' })
  create(@Req() req: any, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(req.user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my applications (student)' })
  getMyApplications(@Req() req: any) {
    return this.applicationsService.findAll(req.user.id);
  }

  @Get('my/:id')
  @ApiOperation({ summary: 'Get a specific application (student)' })
  getMyApplication(@Req() req: any, @Param('id') id: string) {
    return this.applicationsService.findOne(req.user.id, id);
  }

  @Patch('my/:id/submit')
  @ApiOperation({ summary: 'Submit application with payment reference (student)' })
  submitApplication(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SubmitApplicationDto,
  ) {
    return this.applicationsService.submit(req.user.id, id, dto);
  }

  @Patch('my/:id/resubmit')
  @ApiOperation({ summary: 'Correct and resubmit a returned application (student)' })
  resubmitApplication(@Req() req: any, @Param('id') id: string, @Body() dto: ResubmitApplicationDto) {
    return this.applicationsService.resubmit(req.user.id, id, dto);
  }

  @Delete('my/:id')
  @ApiOperation({ summary: 'Cancel a draft application (student)' })
  cancelApplication(@Req() req: any, @Param('id') id: string) {
    return this.applicationsService.cancel(req.user.id, id);
  }

  // Staff endpoints
  // NOTE: 'stats' must be declared before ':id' so it isn't matched as an id.
  @Get('stats')
  @UseGuards(PermissionsGuard)
  @RequirePermission('applications', 'VIEW')
  @ApiOperation({ summary: 'Get dashboard statistics (staff)' })
  getStats() {
    return this.applicationsService.getStats();
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission('applications', 'VIEW')
  @ApiOperation({ summary: 'Get all applications (staff)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'statuses', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'ISO date string YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'ISO date string YYYY-MM-DD' })
  getAllApplications(
    @Query('status') status?: string,
    @Query('statuses') statusesRaw?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const statuses = statusesRaw ? statusesRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    return this.applicationsService.findAllStaff({ status, statuses, type, search, dateFrom, dateTo });
  }

  // Admissions — approved applications and the exam timetable used to print
  // admission cards. Declared before ':id' so 'admissions' isn't matched as an id.
  @Get('admissions')
  @UseGuards(PermissionsGuard)
  @RequirePermission('admissions', 'VIEW')
  @ApiOperation({ summary: 'Get approved applications for admission (staff)' })
  getAdmissions() {
    return this.applicationsService.findAdmissions();
  }

  @Get('admissions/exams')
  @UseGuards(PermissionsGuard)
  @RequirePermission('admissions', 'VIEW')
  @ApiOperation({ summary: 'Get exam timetable rows (course → date/time) for admission cards' })
  getAdmissionExams() {
    return this.applicationsService.admissionScheduledExams();
  }

  @Patch('admissions/:subjectId/printed')
  @UseGuards(PermissionsGuard)
  @RequirePermission('admissions', 'VIEW')
  @ApiOperation({ summary: "Mark a subject's admission card as printed (staff); reset needs admin" })
  markAdmissionPrinted(@Req() req: any, @Param('subjectId') subjectId: string, @Body('printed') printed?: boolean) {
    return this.applicationsService.markAdmissionPrinted(subjectId, req.user, printed !== false);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('applications', 'VIEW')
  @ApiOperation({ summary: 'Get application by ID (staff)' })
  getApplication(@Param('id') id: string) {
    return this.applicationsService.findOneStaff(id);
  }

  // Stage 1 — Exam Division data-validity check.
  @Patch(':id/exam-review')
  @UseGuards(PermissionsGuard)
  @RequirePermission('applications', 'FULL')
  @ApiOperation({ summary: 'Exam Division: reject or forward to finance (staff)' })
  examReview(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewActionDto) {
    return this.applicationsService.examReview(req.user.id, id, dto);
  }

  // Exam Division — decline a single subject while keeping the rest.
  @Patch(':id/subjects/:subjectId/decline')
  @UseGuards(PermissionsGuard)
  @RequirePermission('applications', 'FULL')
  @ApiOperation({ summary: 'Exam Division: decline one subject on an application (staff)' })
  declineSubject(@Req() req: any, @Param('id') id: string, @Param('subjectId') subjectId: string, @Body() dto: DeclineSubjectDto) {
    return this.applicationsService.declineSubject(req.user.id, id, subjectId, dto);
  }

  // Stage 2 — Finance payment verification.
  @Patch(':id/payment-review')
  @UseGuards(PermissionsGuard)
  @RequirePermission('payments', 'FULL')
  @ApiOperation({ summary: 'Finance: approve or reject payment (staff)' })
  paymentReview(@Req() req: any, @Param('id') id: string, @Body() dto: PaymentReviewDto) {
    return this.applicationsService.financeReview(req.user, id, dto);
  }

  // Stage 3 — Exam Registrar final approval.
  @Patch(':id/final-approve')
  @UseGuards(PermissionsGuard)
  @RequirePermission('approvals', 'FULL')
  @ApiOperation({ summary: 'Exam Registrar: final approval of a payment-verified application (staff)' })
  finalApprove(@Req() req: any, @Param('id') id: string, @Body() dto: FinalApprovalDto) {
    return this.applicationsService.registrarApprove(req.user.id, id, dto);
  }

  // Stage 3 — Exam Registrar approves several applications at once. Declared
  // before ':id/final-reject' pattern isn't needed, but keep bulk on a static path.
  @Patch('final-approve/bulk')
  @UseGuards(PermissionsGuard)
  @RequirePermission('approvals', 'FULL')
  @ApiOperation({ summary: 'Exam Registrar: approve multiple payment-verified applications (staff)' })
  finalApproveBulk(@Req() req: any, @Body() dto: BulkApproveDto) {
    return this.applicationsService.registrarApproveBulk(req.user.id, dto);
  }

  // Stage 3 — Exam Registrar rejects a payment-verified application.
  @Patch(':id/final-reject')
  @UseGuards(PermissionsGuard)
  @RequirePermission('approvals', 'FULL')
  @ApiOperation({ summary: 'Exam Registrar: reject a payment-verified application (staff)' })
  finalReject(@Req() req: any, @Param('id') id: string, @Body() dto: FinalRejectDto) {
    return this.applicationsService.registrarReject(req.user.id, id, dto);
  }

  // Roll an application back one stage (correct a wrongly-processed application).
  @Patch(':id/rollback')
  @UseGuards(PermissionsGuard)
  @RequirePermission('rollback', 'FULL')
  @ApiOperation({ summary: 'Roll an application back to its previous status (staff)' })
  rollback(@Req() req: any, @Param('id') id: string, @Body() dto: RollbackDto) {
    return this.applicationsService.rollback(req.user.id, id, dto);
  }
}

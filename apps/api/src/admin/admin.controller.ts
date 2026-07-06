import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermission } from '@/auth/decorators/require-permission.decorator';
import { AdminService } from './admin.service';
import {
  CreateStaffUserDto,
  UpdateStaffUserDto,
  CreateProgrammeDto,
  UpdateProgrammeDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  CreateBatchDto,
  UpdateBatchDto,
  CreateExamScheduleDto,
  UpdateExamScheduleDto,
  CreateExamStaffDto,
  UpdateExamStaffDto,
  CreateExamLocationDto,
  UpdateExamLocationDto,
  CreateScheduledExamDto,
  UpdateScheduledExamDto,
  CreateStudentDto,
  UpdateStudentDto,
} from './dtos/admin.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  /* ── Dashboard ── */
  @Get('stats')
  @RequirePermission('users', 'VIEW')
  @ApiOperation({ summary: 'System-wide statistics (admin)' })
  getStats() {
    return this.adminService.getStats();
  }

  /* ── Users ── */
  @Get('users')
  @RequirePermission('users', 'VIEW')
  @ApiOperation({ summary: 'List staff users (admin)' })
  listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  @RequirePermission('users', 'FULL')
  @ApiOperation({ summary: 'Create a staff user (admin)' })
  createUser(@Body() dto: CreateStaffUserDto) {
    return this.adminService.createStaffUser(dto);
  }

  @Patch('users/:id')
  @RequirePermission('users', 'FULL')
  @ApiOperation({ summary: 'Update a staff user (admin)' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateStaffUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @RequirePermission('users', 'FULL')
  @ApiOperation({ summary: 'Deactivate a staff user (admin)' })
  deactivateUser(@Param('id') id: string) {
    return this.adminService.deactivateUser(id);
  }

  @Patch('users/:id/activate')
  @RequirePermission('users', 'FULL')
  @ApiOperation({ summary: 'Reactivate a deactivated staff user (admin)' })
  activateUser(@Param('id') id: string) {
    return this.adminService.reactivateUser(id);
  }

  /* ── Programmes ── */
  @Get('programmes')
  @RequirePermission('programmes', 'VIEW')
  listProgrammes() {
    return this.adminService.listProgrammes();
  }

  @Post('programmes')
  @RequirePermission('programmes', 'FULL')
  createProgramme(@Body() dto: CreateProgrammeDto) {
    return this.adminService.createProgramme(dto);
  }

  @Patch('programmes/:id')
  @RequirePermission('programmes', 'FULL')
  updateProgramme(@Param('id') id: string, @Body() dto: UpdateProgrammeDto) {
    return this.adminService.updateProgramme(id, dto);
  }

  @Delete('programmes/:id')
  @RequirePermission('programmes', 'FULL')
  deleteProgramme(@Param('id') id: string) {
    return this.adminService.deleteProgramme(id);
  }

  /* ── Subjects ── */
  @Get('subjects')
  @RequirePermission('subjects', 'VIEW')
  listSubjects(@Query('programmeId') programmeId?: string) {
    return this.adminService.listSubjects(programmeId);
  }

  @Post('subjects')
  @RequirePermission('subjects', 'FULL')
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.adminService.createSubject(dto);
  }

  @Patch('subjects/:id')
  @RequirePermission('subjects', 'FULL')
  updateSubject(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.adminService.updateSubject(id, dto);
  }

  @Delete('subjects/:id')
  @RequirePermission('subjects', 'FULL')
  deleteSubject(@Param('id') id: string) {
    return this.adminService.deleteSubject(id);
  }

  /* ── Batches ── */
  @Get('batches')
  @RequirePermission('batches', 'VIEW')
  listBatches() {
    return this.adminService.listBatches();
  }

  @Post('batches')
  @RequirePermission('batches', 'FULL')
  createBatch(@Body() dto: CreateBatchDto) {
    return this.adminService.createBatch(dto);
  }

  @Patch('batches/:batchNumber/:intake')
  @RequirePermission('batches', 'FULL')
  updateBatch(
    @Param('batchNumber') batchNumber: string,
    @Param('intake') intake: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.adminService.updateBatch(batchNumber, intake, dto);
  }

  @Delete('batches/:batchNumber/:intake')
  @RequirePermission('batches', 'FULL')
  deleteBatch(@Param('batchNumber') batchNumber: string, @Param('intake') intake: string) {
    return this.adminService.deleteBatch(batchNumber, intake);
  }

  /* ── Exam Schedules ── */
  @Get('exam-schedules')
  @RequirePermission('schedules', 'VIEW')
  listExamSchedules() {
    return this.adminService.listExamSchedules();
  }

  @Post('exam-schedules')
  @RequirePermission('schedules', 'FULL')
  createExamSchedule(@Body() dto: CreateExamScheduleDto) {
    return this.adminService.createExamSchedule(dto);
  }

  @Patch('exam-schedules/:id')
  @RequirePermission('schedules', 'FULL')
  updateExamSchedule(@Param('id') id: string, @Body() dto: UpdateExamScheduleDto) {
    return this.adminService.updateExamSchedule(id, dto);
  }

  @Delete('exam-schedules/:id')
  @RequirePermission('schedules', 'FULL')
  deleteExamSchedule(@Param('id') id: string) {
    return this.adminService.deleteExamSchedule(id);
  }

  @Patch('exam-schedules/:id/publish')
  @RequirePermission('schedules', 'FULL')
  @ApiOperation({ summary: 'Publish a schedule to a public view-only link (admin)' })
  publishSchedule(@Param('id') id: string) {
    return this.adminService.publishSchedule(id);
  }

  @Patch('exam-schedules/:id/unpublish')
  @RequirePermission('schedules', 'FULL')
  @ApiOperation({ summary: 'Unpublish a schedule (admin)' })
  unpublishSchedule(@Param('id') id: string) {
    return this.adminService.unpublishSchedule(id);
  }

  @Patch('exam-schedules/:id/apply-enabled')
  @RequirePermission('schedules', 'FULL')
  @ApiOperation({ summary: 'Enable/disable auto-fill of student applications from this schedule (admin)' })
  setScheduleApplyEnabled(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.adminService.setScheduleApplyEnabled(id, enabled === true);
  }

  /* ── Scheduled exams (timetable rows within a schedule) ── */
  @Get('exam-schedules/:id/exams')
  @RequirePermission('schedules', 'VIEW')
  listScheduledExams(@Param('id') id: string) {
    return this.adminService.listScheduledExams(id);
  }

  @Post('exam-schedules/:id/exams')
  @RequirePermission('schedules', 'FULL')
  createScheduledExam(@Param('id') id: string, @Body() dto: CreateScheduledExamDto) {
    return this.adminService.createScheduledExam(id, dto);
  }

  @Patch('scheduled-exams/:id')
  @RequirePermission('schedules', 'FULL')
  updateScheduledExam(@Param('id') id: string, @Body() dto: UpdateScheduledExamDto) {
    return this.adminService.updateScheduledExam(id, dto);
  }

  @Delete('scheduled-exams/:id')
  @RequirePermission('schedules', 'FULL')
  deleteScheduledExam(@Param('id') id: string) {
    return this.adminService.deleteScheduledExam(id);
  }

  @Post('exam-schedules/:id/import')
  @RequirePermission('schedules', 'FULL')
  @ApiOperation({ summary: 'Bulk import timetable rows from an Excel file (admin)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  importScheduledExams(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('replace') replace?: string,
  ) {
    return this.adminService.importScheduledExams(id, file?.buffer, replace === 'true');
  }

  /* ── Exam staff directory ── */
  @Get('exam-staff')
  @RequirePermission('schedules', 'VIEW')
  listExamStaff(@Query('role') role?: string) {
    return this.adminService.listExamStaff(role);
  }

  @Post('exam-staff')
  @RequirePermission('schedules', 'FULL')
  createExamStaff(@Body() dto: CreateExamStaffDto) {
    return this.adminService.createExamStaff(dto);
  }

  @Patch('exam-staff/:id')
  @RequirePermission('schedules', 'FULL')
  updateExamStaff(@Param('id') id: string, @Body() dto: UpdateExamStaffDto) {
    return this.adminService.updateExamStaff(id, dto);
  }

  @Delete('exam-staff/:id')
  @RequirePermission('schedules', 'FULL')
  deleteExamStaff(@Param('id') id: string) {
    return this.adminService.deleteExamStaff(id);
  }

  /* ── Exam location directory ── */
  @Get('exam-locations')
  @RequirePermission('schedules', 'VIEW')
  listExamLocations() {
    return this.adminService.listExamLocations();
  }

  @Post('exam-locations')
  @RequirePermission('schedules', 'FULL')
  createExamLocation(@Body() dto: CreateExamLocationDto) {
    return this.adminService.createExamLocation(dto);
  }

  @Patch('exam-locations/:id')
  @RequirePermission('schedules', 'FULL')
  updateExamLocation(@Param('id') id: string, @Body() dto: UpdateExamLocationDto) {
    return this.adminService.updateExamLocation(id, dto);
  }

  @Delete('exam-locations/:id')
  @RequirePermission('schedules', 'FULL')
  deleteExamLocation(@Param('id') id: string) {
    return this.adminService.deleteExamLocation(id);
  }

  /* ── Students ── */
  @Get('students')
  @RequirePermission('students', 'VIEW')
  @ApiOperation({ summary: 'List/search students (admin)' })
  listStudents(
    @Query('search') search?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('batchNumber') batchNumber?: string,
    @Query('intake') intake?: string,
  ) {
    return this.adminService.listStudents(search, take ? +take : 50, skip ? +skip : 0, batchNumber, intake);
  }

  @Post('students')
  @RequirePermission('students', 'FULL')
  @ApiOperation({ summary: 'Create a student (admin)' })
  createStudent(@Body() dto: CreateStudentDto) {
    return this.adminService.createStudent(dto);
  }

  @Patch('students/:id')
  @RequirePermission('students', 'FULL')
  @ApiOperation({ summary: 'Update a student (admin)' })
  updateStudent(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.adminService.updateStudent(id, dto);
  }

  @Delete('students/:id')
  @RequirePermission('students', 'FULL')
  @ApiOperation({ summary: 'Delete a student (admin)' })
  deleteStudent(@Param('id') id: string) {
    return this.adminService.deleteStudent(id);
  }

  @Post('students/import')
  @RequirePermission('students', 'FULL')
  @ApiOperation({ summary: 'Bulk import students from an Excel file (admin)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  importStudents(
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRun?: string,
  ) {
    return this.adminService.importStudents(file?.buffer, dryRun === 'true');
  }
}

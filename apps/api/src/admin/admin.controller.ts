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
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import {
  CreateStaffUserDto,
  UpdateStaffUserDto,
  CreateProgrammeDto,
  UpdateProgrammeDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  CreateBatchDto,
  CreateExamScheduleDto,
  UpdateExamScheduleDto,
  CreateStudentDto,
  UpdateStudentDto,
} from './dtos/admin.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  /* ── Dashboard ── */
  @Get('stats')
  @ApiOperation({ summary: 'System-wide statistics (admin)' })
  getStats() {
    return this.adminService.getStats();
  }

  /* ── Users ── */
  @Get('roles')
  @ApiOperation({ summary: 'List all roles (admin)' })
  listRoles() {
    return this.adminService.listRoles();
  }

  @Get('users')
  @ApiOperation({ summary: 'List staff users (admin)' })
  listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a staff user (admin)' })
  createUser(@Body() dto: CreateStaffUserDto) {
    return this.adminService.createStaffUser(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update a staff user (admin)' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateStaffUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Deactivate a staff user (admin)' })
  deactivateUser(@Param('id') id: string) {
    return this.adminService.deactivateUser(id);
  }

  /* ── Programmes ── */
  @Get('programmes')
  listProgrammes() {
    return this.adminService.listProgrammes();
  }

  @Post('programmes')
  createProgramme(@Body() dto: CreateProgrammeDto) {
    return this.adminService.createProgramme(dto);
  }

  @Patch('programmes/:id')
  updateProgramme(@Param('id') id: string, @Body() dto: UpdateProgrammeDto) {
    return this.adminService.updateProgramme(id, dto);
  }

  @Delete('programmes/:id')
  deleteProgramme(@Param('id') id: string) {
    return this.adminService.deleteProgramme(id);
  }

  /* ── Subjects ── */
  @Get('subjects')
  listSubjects(@Query('programmeId') programmeId?: string) {
    return this.adminService.listSubjects(programmeId);
  }

  @Post('subjects')
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.adminService.createSubject(dto);
  }

  @Patch('subjects/:id')
  updateSubject(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.adminService.updateSubject(id, dto);
  }

  @Delete('subjects/:id')
  deleteSubject(@Param('id') id: string) {
    return this.adminService.deleteSubject(id);
  }

  /* ── Batches ── */
  @Get('batches')
  listBatches() {
    return this.adminService.listBatches();
  }

  @Post('batches')
  createBatch(@Body() dto: CreateBatchDto) {
    return this.adminService.createBatch(dto);
  }

  @Delete('batches/:batchNumber/:intake')
  deleteBatch(@Param('batchNumber') batchNumber: string, @Param('intake') intake: string) {
    return this.adminService.deleteBatch(batchNumber, intake);
  }

  /* ── Exam Schedules ── */
  @Get('exam-schedules')
  listExamSchedules() {
    return this.adminService.listExamSchedules();
  }

  @Post('exam-schedules')
  createExamSchedule(@Body() dto: CreateExamScheduleDto) {
    return this.adminService.createExamSchedule(dto);
  }

  @Patch('exam-schedules/:id')
  updateExamSchedule(@Param('id') id: string, @Body() dto: UpdateExamScheduleDto) {
    return this.adminService.updateExamSchedule(id, dto);
  }

  @Delete('exam-schedules/:id')
  deleteExamSchedule(@Param('id') id: string) {
    return this.adminService.deleteExamSchedule(id);
  }

  /* ── Students ── */
  @Get('students')
  @ApiOperation({ summary: 'List/search students (admin)' })
  listStudents(
    @Query('search') search?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.listStudents(search, take ? +take : 50, skip ? +skip : 0);
  }

  @Post('students')
  @ApiOperation({ summary: 'Create a student (admin)' })
  createStudent(@Body() dto: CreateStudentDto) {
    return this.adminService.createStudent(dto);
  }

  @Patch('students/:id')
  @ApiOperation({ summary: 'Update a student (admin)' })
  updateStudent(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.adminService.updateStudent(id, dto);
  }

  @Delete('students/:id')
  @ApiOperation({ summary: 'Delete a student (admin)' })
  deleteStudent(@Param('id') id: string) {
    return this.adminService.deleteStudent(id);
  }

  @Post('students/import')
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

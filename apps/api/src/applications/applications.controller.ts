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
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto, SubmitApplicationDto, ReviewActionDto } from './dtos/application.dto';

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

  @Delete('my/:id')
  @ApiOperation({ summary: 'Cancel a draft application (student)' })
  cancelApplication(@Req() req: any, @Param('id') id: string) {
    return this.applicationsService.cancel(req.user.id, id);
  }

  // Staff endpoints
  // NOTE: 'stats' must be declared before ':id' so it isn't matched as an id.
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('FINANCE_OFFICER', 'VERIFICATION_OFFICER', 'SCHEDULE_OFFICER', 'EXAM_MANAGER', 'REGISTRAR', 'DIRECTOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get dashboard statistics (staff)' })
  getStats() {
    return this.applicationsService.getStats();
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('FINANCE_OFFICER', 'VERIFICATION_OFFICER', 'SCHEDULE_OFFICER', 'EXAM_MANAGER', 'REGISTRAR', 'DIRECTOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all applications (staff)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  getAllApplications(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.applicationsService.findAllStaff({ status, type, search });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('FINANCE_OFFICER', 'VERIFICATION_OFFICER', 'SCHEDULE_OFFICER', 'EXAM_MANAGER', 'REGISTRAR', 'DIRECTOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get application by ID (staff)' })
  getApplication(@Param('id') id: string) {
    return this.applicationsService.findOneStaff(id);
  }

  // Stage 1 — Exam Division data-validity check.
  @Patch(':id/exam-review')
  @UseGuards(RolesGuard)
  @Roles('VERIFICATION_OFFICER', 'EXAM_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Exam Division: reject or forward to finance (staff)' })
  examReview(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewActionDto) {
    return this.applicationsService.examReview(req.user.id, id, dto);
  }
}

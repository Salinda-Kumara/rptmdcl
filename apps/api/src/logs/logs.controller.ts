import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { LogsService } from './logs.service';

@ApiTags('Logs')
@Controller('logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  // Logs are restricted to Master Admins only.
  private assertAdmin(req: any) {
    if (!req.user?.isAdmin) throw new ForbiddenException('Only administrators can view logs');
  }

  @Get()
  @ApiOperation({ summary: 'List action logs (master admin)' })
  @ApiQuery({ name: 'entityId', required: false, description: 'Filter to one application id' })
  @ApiQuery({ name: 'serial', required: false, description: 'Filter by application serial number' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'method', required: false })
  @ApiQuery({ name: 'success', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  list(
    @Req() req: any,
    @Query('entityId') entityId?: string,
    @Query('serial') serial?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('method') method?: string,
    @Query('success') success?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    this.assertAdmin(req);
    return this.logs.list({
      entityId,
      serial,
      userId,
      action,
      method,
      success: success === undefined ? undefined : success === 'true',
      search,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('actions')
  @ApiOperation({ summary: 'Distinct action names for filtering (master admin)' })
  actions(@Req() req: any) {
    this.assertAdmin(req);
    return this.logs.actions();
  }
}

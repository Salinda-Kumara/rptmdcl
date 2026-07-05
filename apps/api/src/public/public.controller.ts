import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';

// Unauthenticated, read-only endpoints for publicly shared content.
@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('schedules/:token')
  @ApiOperation({ summary: 'View a published exam schedule (no auth)' })
  getSchedule(@Param('token') token: string) {
    return this.publicService.getPublicSchedule(token);
  }
}

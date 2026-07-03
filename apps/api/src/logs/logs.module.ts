import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { LoggingInterceptor } from './logging.interceptor';

// Global so the LogsService and the auto-logging interceptor apply app-wide.
@Global()
@Module({
  controllers: [LogsController],
  providers: [
    LogsService,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
  exports: [LogsService],
})
export class LogsModule {}

import { Module } from '@nestjs/common';
import { MedicalsController } from './medicals.controller';
import { MedicalsService } from './medicals.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { StorageModule } from '@/storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [MedicalsController],
  providers: [MedicalsService],
  exports: [MedicalsService],
})
export class MedicalsModule {}

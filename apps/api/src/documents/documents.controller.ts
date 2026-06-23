import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { MAX_FILE_SIZE } from './documents.constants';

function isStaffUser(user: any): boolean {
  return Array.isArray(user?.roles) && user.roles.some((r: any) => r?.role?.name && r.role.name !== 'STUDENT');
}

@ApiTags('Documents')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post('applications/:id/documents')
  @ApiOperation({ summary: 'Upload a document (payment slip, medical certificate, etc.)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  upload(
    @Req() req: any,
    @Param('id') applicationId: string,
    @Body('documentType') documentType: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.upload(req.user.id, applicationId, documentType, file);
  }

  @Get('applications/:id/documents')
  @ApiOperation({ summary: 'List documents for an application' })
  list(@Req() req: any, @Param('id') applicationId: string) {
    return this.documentsService.list(req.user.id, applicationId);
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Download / view a document' })
  async download(
    @Req() req: any,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const document = await this.documentsService.getForDownload(req.user.id, id, isStaffUser(req.user));
    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(document.fileName)}"`,
    });
    return new StreamableFile(this.documentsService.stream(document.minioPath));
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a document' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.remove(req.user.id, id);
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  DOCUMENT_TYPES,
  DocumentType,
  EDITABLE_STATUSES,
  MAX_FILE_SIZE,
} from './documents.constants';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /** Resolve the student that owns this user, or throw. */
  private async studentFor(userId: string) {
    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  private validateFile(file: Express.Multer.File, documentType: string) {
    if (!file) throw new BadRequestException('No file provided');

    if (!DOCUMENT_TYPES.includes(documentType as DocumentType)) {
      throw new BadRequestException(
        `documentType must be one of: ${DOCUMENT_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds the 10MB limit');
    }

    const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException('Only PDF, JPG and PNG files are allowed');
    }
  }

  /** Upload a document to an application owned by the student. */
  async upload(
    userId: string,
    applicationId: string,
    documentType: string,
    file: Express.Multer.File,
    applicationSubjectId?: string,
  ) {
    this.validateFile(file, documentType);
    const student = await this.studentFor(userId);

    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, studentId: student.id, deletedAt: null },
    });
    if (!application) throw new NotFoundException('Application not found');

    if (!EDITABLE_STATUSES.includes(application.status)) {
      throw new ForbiddenException(
        'Attachments cannot be added after the application has been submitted',
      );
    }

    // When the document targets a specific subject, verify the subject belongs
    // to this application.
    if (applicationSubjectId) {
      const subject = await this.prisma.applicationSubject.findFirst({
        where: { id: applicationSubjectId, applicationId },
      });
      if (!subject) throw new BadRequestException('Subject does not belong to this application');
    }

    const storagePath = await this.storage.put(applicationId, file.originalname, file.buffer);

    return this.prisma.document.create({
      data: {
        applicationId,
        applicationSubjectId: applicationSubjectId || null,
        documentType,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        minioPath: storagePath,
        uploadedBy: userId,
      },
    });
  }

  /** List documents for an application the student owns. */
  async list(userId: string, applicationId: string) {
    const student = await this.studentFor(userId);
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, studentId: student.id, deletedAt: null },
    });
    if (!application) throw new NotFoundException('Application not found');

    return this.prisma.document.findMany({
      where: { applicationId, deletedAt: null },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  /** Fetch a document record for download (student must own it, or be staff). */
  async getForDownload(userId: string, documentId: string, isStaff: boolean) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, deletedAt: null },
      include: { application: { include: { student: true } } },
    });
    if (!document) throw new NotFoundException('Document not found');

    if (!isStaff && document.application.student?.userId !== userId) {
      throw new ForbiddenException('You do not have access to this document');
    }

    return document;
  }

  /** Soft-delete a document the student owns (only while editable). */
  async remove(userId: string, documentId: string) {
    const student = await this.studentFor(userId);
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, deletedAt: null },
      include: { application: true },
    });
    if (!document) throw new NotFoundException('Document not found');

    if (document.application.studentId !== student.id) {
      throw new ForbiddenException('You do not have access to this document');
    }
    if (!EDITABLE_STATUSES.includes(document.application.status)) {
      throw new ForbiddenException('Documents can no longer be removed after submission');
    }

    await this.storage.remove(document.minioPath);
    return this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });
  }

  stream(storagePath: string) {
    return this.storage.getStream(storagePath);
  }
}

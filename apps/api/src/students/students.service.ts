import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      include: {
        batch: {
          include: { programme: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return student;
  }

  async getSubjects(userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      include: {
        batch: { include: { programme: { include: { subjects: { where: { deletedAt: null } } } } } },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student.batch?.programme?.subjects ?? [];
  }
}

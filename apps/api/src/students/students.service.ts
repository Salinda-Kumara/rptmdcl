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

    const own = student.batch?.programme?.subjects ?? [];
    if (own.length > 0) return own;

    // Fallback: the student's programme has no subjects of its own (e.g. imported
    // students whose batch maps to a programme that hasn't been set up with
    // subjects yet). Return all active subjects so they can still apply.
    return this.prisma.subject.findMany({
      where: { deletedAt: null },
      orderBy: [{ programmeId: 'asc' }, { code: 'asc' }],
    });
  }

  async getExamSchedules(userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      include: { batch: { include: { programme: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    return this.prisma.examinationSchedule.findMany({
      where: {
        programmeId: student.batch?.programmeId,
        deletedAt: null,
        endDate: { gte: new Date() },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Timetable rows from schedules with "enable for apply" switched on — used to
   * auto-fill the upcoming exam date + intake when a student picks a subject.
   * Keyed by course code on the client.
   */
  async getScheduledExams(userId: string) {
    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) throw new NotFoundException('Student not found');

    return this.prisma.scheduledExam.findMany({
      where: { schedule: { applyEnabled: true, deletedAt: null } },
      select: {
        courseCode: true,
        courseName: true,
        intake: true,
        examDate: true,
        revisedDate: true,
      },
      orderBy: { examDate: 'asc' },
    });
  }
}

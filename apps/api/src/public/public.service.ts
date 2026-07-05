import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  // Returns a published schedule with staff names resolved. No auth required —
  // only schedules that have been explicitly published are exposed.
  async getPublicSchedule(token: string) {
    const schedule = await this.prisma.examinationSchedule.findFirst({
      where: { publicToken: token, published: true, deletedAt: null },
      include: { exams: { orderBy: [{ examDate: 'asc' }, { orderIndex: 'asc' }] } },
    });
    if (!schedule) throw new NotFoundException('Schedule not found or not published');

    const ids = new Set<string>();
    for (const e of schedule.exams) {
      [...e.chiefExaminerIds, ...e.supervisorIds, ...e.invigilatorIds, ...e.supportingIds].forEach((i) => ids.add(i));
    }
    const staff = ids.size
      ? await this.prisma.examStaff.findMany({ where: { id: { in: [...ids] } } })
      : [];
    const byId = new Map(staff.map((s) => [s.id, s.name]));
    const nm = (arr: string[]) => arr.map((i) => byId.get(i)).filter(Boolean) as string[];

    return {
      name: schedule.name,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      description: schedule.description,
      publishedAt: schedule.publishedAt,
      exams: schedule.exams.map((e) => ({
        id: e.id,
        serialCode: e.serialCode,
        startAtLabel: e.startAtLabel,
        examDate: e.examDate,
        weekday: e.weekday,
        revisedDate: e.revisedDate,
        intake: e.intake,
        courseCode: e.courseCode,
        courseName: e.courseName,
        expectedCount: e.expectedCount,
        session1: e.session1,
        session2: e.session2,
        session3: e.session3,
        location: e.location,
        chiefExaminers: nm(e.chiefExaminerIds),
        supervisors: nm(e.supervisorIds),
        invigilators: nm(e.invigilatorIds),
        supporting: nm(e.supportingIds),
      })),
    };
  }
}

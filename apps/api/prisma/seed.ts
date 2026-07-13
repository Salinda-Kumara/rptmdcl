import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { juneJulySchedule } from './seed-data/june-july-schedule';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Programmes — the two active degree programmes. Student records themselves are
  // NOT seeded; they are imported from Excel via the admin Students screen.
  const accountingProgramme = await prisma.programme.upsert({
    where: { code: 'BSAA' },
    update: { name: 'BSc in Applied Accounting' },
    create: {
      code: 'BSAA',
      name: 'BSc in Applied Accounting',
      description: 'Bachelor of Science (Honours) in Applied Accounting',
    },
  });

  const bmbaProgramme = await prisma.programme.upsert({
    where: { code: 'BMBA' },
    update: { name: 'B.Mgt. in Business Analytics' },
    create: {
      code: 'BMBA',
      name: 'B.Mgt. in Business Analytics',
      description: 'Bachelor of Management in Business Analytics',
    },
  });

  // Normalize legacy Applied-Accounting programme codes into BSAA so imported
  // students (reg-numbers beginning "BSc") inherit its subjects. Reg prefixes
  // BSc/BAA/AA all mean Applied Accounting.
  const legacyAA = await prisma.programme.findMany({ where: { code: { in: ['BSC', 'BAA', 'AA'] } } });
  for (const lp of legacyAA) {
    await prisma.batch.updateMany({ where: { programmeId: lp.id }, data: { programmeId: accountingProgramme.id } });
    const [batches, subjects] = await Promise.all([
      prisma.batch.count({ where: { programmeId: lp.id } }),
      prisma.subject.count({ where: { programmeId: lp.id } }),
    ]);
    if (batches === 0 && subjects === 0) {
      await prisma.programme.delete({ where: { id: lp.id } });
      console.log(`  ↪ folded legacy programme "${lp.code}" into BSAA`);
    }
  }

  // Helper: replace a staff user's permission set (PBAC).
  const grant = async (userId: string, perms: { resource: string; level: 'VIEW' | 'FULL' }[]) => {
    await prisma.userPermission.deleteMany({ where: { userId } });
    if (perms.length > 0) {
      await prisma.userPermission.createMany({
        data: perms.map((p) => ({ userId, resource: p.resource, level: p.level })),
      });
    }
  };

  // Subjects

  // BSc in Applied Accounting — Curriculum 2020. Codes keep the space (e.g.
  // "BSAA 11013") to match the printed curriculum and exam-schedule course codes.
  const subjectData = [
    { code: 'BSAA 11013', name: 'Financial Accounting', category: 'Core' },
    { code: 'BSAA 11023', name: 'Management Fundamentals', category: 'Core' },
    { code: 'BSAA 11032', name: 'Principles of Economics', category: 'Core' },
    { code: 'BSAA 11043', name: 'Financial Mathematics', category: 'Core' },
    { code: 'BSAA 11052', name: 'Business Law', category: 'Core' },
    { code: 'BSAA 11062', name: 'Business Communication & Skill Development I', category: 'Core' },
    { code: 'BSAA 12013', name: 'Information Technology in Business', category: 'Core' },
    { code: 'BSAA 12023', name: 'Cost & Management Accounting', category: 'Core' },
    { code: 'BSAA 12033', name: 'Marketing Management', category: 'Core' },
    { code: 'BSAA 12042', name: 'Business Economics', category: 'Core' },
    { code: 'BSAA 12052', name: 'Business Statistics & Forecasting', category: 'Core' },
    { code: 'BSAA 12062', name: 'Business Taxation', category: 'Core' },
    { code: 'BSAA 21013', name: 'Financial Reporting', category: 'Core' },
    { code: 'BSAA 21023', name: 'Business Processes, Controls & Audits', category: 'Core' },
    { code: 'BSAA 21032', name: 'Human Resource Management', category: 'Core' },
    { code: 'BSAA 21042', name: 'Management Information Systems', category: 'Core' },
    { code: 'BSAA 21053', name: 'Business Finance', category: 'Core' },
    { code: 'BSAA 21062', name: 'Business Communication & Skill Development II', category: 'Core' },
    { code: 'BSAA 22013', name: 'Accounting in Digital Environment', category: 'Core' },
    { code: 'BSAA 22023', name: 'Advanced Management Accounting', category: 'Core' },
    { code: 'BSAA 22033', name: 'Audit & Assurance', category: 'Core' },
    { code: 'BSAA 22043', name: 'Operations Management', category: 'Core' },
    { code: 'BSAA 22053', name: 'Corporate Law', category: 'Core' },
    { code: 'BSAA 31013', name: 'Corporate Reporting', category: 'Core' },
    { code: 'BSAA 31023', name: 'Digital Business Strategy', category: 'Core' },
    { code: 'BSAA 31033', name: 'Research Methodology', category: 'Core' },
    { code: 'BSAA 31044', name: 'Internship in Accounting I', category: 'Core' },
    { code: 'BSAA 31052', name: 'Skills in Leadership & Innovation', category: 'Core' },
    { code: 'BSAA 32013', name: 'Governance, Ethics and Risk Management', category: 'Core' },
    { code: 'BSAA 32024', name: 'Corporate Taxation', category: 'Core' },
    { code: 'BSAA 32034', name: 'Package Based Data Analysis', category: 'Elective' },
    { code: 'BSAA 32044', name: 'Business Research Project', category: 'Elective' },
    { code: 'BSAA 32054', name: 'Internship in Accounting II', category: 'Core' },
    { code: 'BSAA 41012', name: 'Entrepreneurship', category: 'Elective' },
    { code: 'BSAA 41022', name: 'International Business', category: 'Elective' },
    { code: 'BSAA 41032', name: 'Organizational Behaviour', category: 'Elective' },
    { code: 'BSAA 41043', name: 'Corporate Finance & Risk Management', category: 'Core' },
    { code: 'BSAA 41054', name: 'Internship in Accounting III', category: 'Core' },
    { code: 'BSAA 41063', name: 'Business Intelligence', category: 'Core' },
    { code: 'BSAA 41073', name: 'Business Analytics', category: 'Core' },
    { code: 'BSAA 41083', name: 'Information Security & Fraud Analytics', category: 'Core' },
    { code: 'BSAA 41093', name: 'Forensic Accounting', category: 'Core' },
    { code: 'BSAA 41103', name: 'Security Analysis & Business Valuation', category: 'Core' },
    { code: 'BSAA 41113', name: 'Financial Modeling & Forecasting', category: 'Core' },
    { code: 'BSAA 42012', name: 'Contemporary Issues in Accounting', category: 'Core' },
    { code: 'BSAA 42023', name: 'Strategic Management', category: 'Core' },
    { code: 'BSAA 42036', name: 'Dissertation', category: 'Core' },
    { code: 'BSAA 42044', name: 'Internship in Accounting IV', category: 'Core' },
  ];

  for (const s of subjectData) {
    await prisma.subject.upsert({
      where: { code_programmeId: { code: s.code, programmeId: accountingProgramme.id } },
      update: { name: s.name, category: s.category },
      create: { code: s.code, name: s.name, category: s.category, programmeId: accountingProgramme.id },
    });
  }

  // B.Mgt. in Business Analytics — Handbook 2024 (General + Honours, deduped).
  const bmbaSubjects = [
    { code: 'BMBA 1113', name: 'Introduction to Business Management', category: 'Core' },
    { code: 'BMBA 1123', name: 'Mathematics for Data Science', category: 'Core' },
    { code: 'BMBA 1133', name: 'Introduction to Data Analytics', category: 'Core' },
    { code: 'BMBA 1143', name: 'Accounting for Business', category: 'Core' },
    { code: 'BMBA 1152', name: 'Personal Development and Academic Writing', category: 'Core' },
    { code: 'BMBA 1162', name: 'Legal Environment', category: 'Core' },
    { code: 'BMBA 1212', name: 'Human Resource Management', category: 'Core' },
    { code: 'BMBA 1223', name: 'Statistical Methods for Management Decisions', category: 'Core' },
    { code: 'BMBA 1232', name: 'Principles of Economics', category: 'Core' },
    { code: 'BMBA 1242', name: 'Leadership in Organizations', category: 'Core' },
    { code: 'BMBA 1253', name: 'Foundations of Business Analytics', category: 'Core' },
    { code: 'BMBA 1262', name: 'Accounting Information Systems', category: 'Core' },
    { code: 'BMBA 2112', name: 'Business Analytical Techniques', category: 'Core' },
    { code: 'BMBA 2123', name: 'Financial Management', category: 'Core' },
    { code: 'BMBA 2132', name: 'Marketing Management', category: 'Core' },
    { code: 'BMBA 2142', name: 'Descriptive Analytics & Data Management', category: 'Core' },
    { code: 'BMBA 2153', name: 'Cost and Management Accounting', category: 'Core' },
    { code: 'BMBA 2163', name: 'Digital Transformation', category: 'Core' },
    { code: 'BMBA 2212', name: 'Customer Analytics', category: 'Core' },
    { code: 'BMBA 2223', name: 'Predictive Analytics with Excel', category: 'Core' },
    { code: 'BMBA 2233', name: 'Data Science and Visualization for Business', category: 'Core' },
    { code: 'BMBA 2243', name: 'Big Data Analytics', category: 'Core' },
    { code: 'BMBA 2253', name: 'Operations Analytics', category: 'Core' },
    { code: 'BMBA 2262', name: 'Competitor Analysis and Market Intelligence', category: 'Core' },
    { code: 'BMBA 3113', name: 'Introduction to Machine Learning for Data Analysis', category: 'Core' },
    { code: 'BMBA 3123', name: 'Information Security and Fraud Analytics', category: 'Core' },
    { code: 'BMBA 3133', name: 'Marketing Analytics', category: 'Core' },
    { code: 'BMBA 3142', name: 'Applied Modelling for Management Decisions', category: 'Core' },
    { code: 'BMBA 3153', name: 'Simulation for Complex Business Problems', category: 'Core' },
    { code: 'BMBA 3163', name: 'Database Design', category: 'Core' },
    { code: 'BMBA 3174', name: 'Research Methodology', category: 'Core' },
    { code: 'BMBA 3213', name: 'Artificial Neural Network for Business Analytics', category: 'Core' },
    { code: 'BMBA 3223', name: 'People Analytics', category: 'Core' },
    { code: 'BMBA 3232', name: 'Supply Chain Analytics', category: 'Core' },
    { code: 'BMBA 3243', name: 'Decision Support Systems', category: 'Core' },
    { code: 'BMBA 3253', name: 'Artificial Intelligence', category: 'Core' },
    { code: 'BMBA 3263', name: 'Data Mining and Data Warehousing', category: 'Core' },
    { code: 'BMBA 3273', name: 'Strategic Management', category: 'Core' },
    { code: 'BMBA 3284', name: 'Business Analytics Internship', category: 'Core' },
    { code: 'BMBA 3293', name: 'Business Analytics Project', category: 'Core' },
    { code: 'BMBA 4113', name: 'Business Strategy', category: 'Core' },
    { code: 'BMBA 4123', name: 'Strategic Information Systems', category: 'Core' },
    { code: 'BMBA 4133', name: 'Research Methodology', category: 'Core' },
    { code: 'BMBA 4143', name: 'Introduction to Blockchain Technology', category: 'Core' },
    { code: 'BMBA 4153', name: 'Social Media Strategy', category: 'Core' },
    { code: 'BMBA 4163', name: 'Forensic Data Analytics', category: 'Core' },
    { code: 'BMBA 4214', name: 'Business Analytics Internship', category: 'Core' },
    { code: 'BMBA 4226', name: 'Dissertation', category: 'Core' },
    { code: 'BMBA 4232', name: 'Advance Business Intelligence', category: 'Elective' },
    { code: 'BMBA 4242', name: 'Business Strategic Analysis', category: 'Elective' },
    { code: 'BMBA 4252', name: 'Business Metrics for Data-Driven Companies', category: 'Elective' },
  ];

  for (const s of bmbaSubjects) {
    await prisma.subject.upsert({
      where: { code_programmeId: { code: s.code, programmeId: bmbaProgramme.id } },
      update: { name: s.name, category: s.category },
      create: { code: s.code, name: s.name, category: s.category, programmeId: bmbaProgramme.id },
    });
  }

  // Exam-duty staff directory (used when scheduling exams).
  const examStaff: { name: string; role: string }[] = [
    { name: 'Dilshan Dissanayake', role: 'EXAMINER' },
    { name: 'Ishara Ranasinghe', role: 'EXAMINER' },
    { name: 'Isuri Chandeepa', role: 'EXAMINER' },
    { name: 'Isuri Samarawickrama', role: 'EXAMINER' },
    { name: 'Lakdinithi Subasinghe', role: 'EXAMINER' },
    { name: 'Malintha Perera', role: 'EXAMINER' },
    { name: 'Nipunee Jayasuriya', role: 'EXAMINER' },
    { name: 'Nishanthini Simon', role: 'EXAMINER' },
    { name: 'Sirini Punsara', role: 'EXAMINER' },
    { name: 'Supun Madhushanka', role: 'EXAMINER' },
    { name: 'Hasitha', role: 'SUPERVISOR' },
    { name: 'Pasindu', role: 'SUPERVISOR' },
    { name: 'Sandun', role: 'SUPERVISOR' },
    { name: 'Shashinika', role: 'SUPERVISOR' },
    { name: 'Ishanka', role: 'INVIGILATOR' },
    { name: 'Nimansha', role: 'INVIGILATOR' },
    { name: 'Niyumi', role: 'INVIGILATOR' },
    { name: 'Salinda', role: 'INVIGILATOR' },
    { name: 'Sasini', role: 'INVIGILATOR' },
    { name: 'Thilanka', role: 'INVIGILATOR' },
    { name: 'Vajira', role: 'INVIGILATOR' },
    { name: 'Viraj', role: 'INVIGILATOR' },
    { name: 'Roshan', role: 'SUPPORTING' },
  ];
  for (const p of examStaff) {
    const existing = await prisma.examStaff.findFirst({ where: { name: p.name, role: p.role, deletedAt: null } });
    if (!existing) await prisma.examStaff.create({ data: { name: p.name, role: p.role } });
  }

  // June/July 2026 ESE schedule with its 39 exam rows (idempotent by name).
  const existingSchedule = await prisma.examinationSchedule.findFirst({
    where: { name: juneJulySchedule.name, deletedAt: null },
  });
  if (!existingSchedule) {
    const staffRows = await prisma.examStaff.findMany({ where: { deletedAt: null } });
    const staffId = new Map(staffRows.map((s) => [`${s.role}::${s.name.trim().toLowerCase()}`, s.id]));
    const resolve = (names: string[], role: string) =>
      names.map((n) => staffId.get(`${role}::${n.trim().toLowerCase()}`)).filter(Boolean) as string[];

    const schedule = await prisma.examinationSchedule.create({
      data: {
        name: juneJulySchedule.name,
        startDate: new Date(juneJulySchedule.startDate),
        endDate: new Date(juneJulySchedule.endDate),
      },
    });
    for (const e of juneJulySchedule.exams) {
      await prisma.scheduledExam.create({
        data: {
          scheduleId: schedule.id,
          orderIndex: e.orderIndex,
          serialCode: e.serialCode,
          startAtLabel: e.startAtLabel,
          examDate: e.examDate ? new Date(e.examDate) : null,
          weekday: e.weekday,
          revisedDate: e.revisedDate ? new Date(e.revisedDate) : null,
          intake: e.intake,
          courseCode: e.courseCode,
          courseName: e.courseName,
          expectedCount: e.expectedCount,
          session1: e.session1,
          session2: e.session2,
          session3: e.session3,
          location: e.location,
          chiefExaminerIds: resolve(e.chiefExaminers, 'EXAMINER'),
          supervisorIds: resolve(e.supervisors, 'SUPERVISOR'),
          invigilatorIds: resolve(e.invigilators, 'INVIGILATOR'),
          supportingIds: resolve(e.supporting, 'SUPPORTING'),
        },
      });
    }
  }

  // NOTE: Students and batches are NOT seeded — they are imported from Excel via
  // the admin Students screen (which derives batches from the reg numbers).

  const password = await argon2.hash('password123');

  // Finance Officer
  const financeUser = await prisma.user.upsert({
    where: { email: 'finance@example.com' },
    update: { password },
    create: { email: 'finance@example.com', password },
  });

  await prisma.staffUser.upsert({
    where: { userId: financeUser.id },
    update: {},
    create: { userId: financeUser.id, name: 'Finance Officer', position: 'Finance Officer' },
  });
  await grant(financeUser.id, [
    { resource: 'applications', level: 'VIEW' },
    { resource: 'payments', level: 'FULL' },
  ]);

  // Verification Officer
  const verificationUser = await prisma.user.upsert({
    where: { email: 'verification@example.com' },
    update: { password },
    create: { email: 'verification@example.com', password },
  });

  await prisma.staffUser.upsert({
    where: { userId: verificationUser.id },
    update: {},
    create: { userId: verificationUser.id, name: 'Verification Officer', position: 'Verification Officer' },
  });
  await grant(verificationUser.id, [
    { resource: 'applications', level: 'FULL' },
  ]);

  // Exam Manager
  const examManagerUser = await prisma.user.upsert({
    where: { email: 'exammanager@example.com' },
    update: { password },
    create: { email: 'exammanager@example.com', password },
  });

  await prisma.staffUser.upsert({
    where: { userId: examManagerUser.id },
    update: {},
    create: { userId: examManagerUser.id, name: 'Exam Manager', position: 'Exam Manager' },
  });
  await grant(examManagerUser.id, [
    { resource: 'applications', level: 'FULL' },
    { resource: 'schedules', level: 'FULL' },
    { resource: 'reports', level: 'VIEW' },
  ]);

  // Master Admin — full access bypass via isAdmin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { password, isAdmin: true },
    create: { email: 'admin@example.com', password, isAdmin: true },
  });

  await prisma.staffUser.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id, name: 'Master Admin', position: 'Administrator' },
  });

  console.log('✅ Seed completed! (programmes + subjects; students are imported via Excel)\n');
  console.log('📝 Staff Credentials:');
  console.log('  Finance Officer - Email: finance@example.com  Password: password123');
  console.log('  Verification Officer - Email: verification@example.com  Password: password123');
  console.log('  Exam Manager - Email: exammanager@example.com  Password: password123');
  console.log('  Master Admin - Email: admin@example.com  Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

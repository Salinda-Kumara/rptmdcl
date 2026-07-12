import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

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

  await prisma.programme.upsert({
    where: { code: 'BMBA' },
    update: { name: 'B.Mgt. in Business Analytics' },
    create: {
      code: 'BMBA',
      name: 'B.Mgt. in Business Analytics',
      description: 'Bachelor of Management in Business Analytics',
    },
  });

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

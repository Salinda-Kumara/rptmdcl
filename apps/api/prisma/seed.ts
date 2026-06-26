import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Programmes
  const accountingProgramme = await prisma.programme.upsert({
    where: { code: 'AA' },
    update: {},
    create: {
      code: 'AA',
      name: 'BSc Applied Accounting',
      description: 'Bachelor of Science in Applied Accounting',
    },
  });

  const bmbaProgram = await prisma.programme.upsert({
    where: { code: 'BMBA' },
    update: {},
    create: {
      code: 'BMBA',
      name: 'Bachelor of Management in Business Analytics',
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
  await prisma.subject.deleteMany({});

  const subjectData = [
    { code: 'BSAA11013', name: 'Financial Accounting', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA11023', name: 'Management Fundamentals', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA11032', name: 'Principles of Economics', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA11043', name: 'Financial Mathematics', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA11052', name: 'Business Law', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA11062', name: 'Business Communication & Skill Development I', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA12013', name: 'Information Technology in Business', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA12023', name: 'Cost & Management Accounting', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA12033', name: 'Marketing Management', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA12042', name: 'Business Economics', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA12052', name: 'Business Statistics & Forecasting', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA12062', name: 'Business Taxation', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA21013', name: 'Financial Reporting', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA21023', name: 'Business Processes, Controls & Audits', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA21032', name: 'Human Resource Management', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA21042', name: 'Management Information Systems', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA21053', name: 'Business Finance', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA21062', name: 'Business Communication & Skill Development II', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA22013', name: 'Accounting in Digital Environment', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA22023', name: 'Advanced Management Accounting', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA22033', name: 'Audit & Assurance', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA22043', name: 'Operations Management', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA22053', name: 'Corporate Law', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA31013', name: 'Corporate Reporting', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA31023', name: 'Digital Business Strategy', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA31033', name: 'Research Methodology', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA31044', name: 'Internship in Accounting I', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA31052', name: 'Skills in Leadership & Innovation', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA32013', name: 'Governance, Ethics and Risk Management', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA32024', name: 'Corporate Taxation', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA32034', name: 'Package Based Data Analysis', category: 'Elective', programmeId: accountingProgramme.id },
    { code: 'BSAA32044', name: 'Business Research Project', category: 'Elective', programmeId: accountingProgramme.id },
    { code: 'BSAA32054', name: 'Internship in Accounting II', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA41012', name: 'Entrepreneurship', category: 'Elective', programmeId: accountingProgramme.id },
    { code: 'BSAA41022', name: 'International Business', category: 'Elective', programmeId: accountingProgramme.id },
    { code: 'BSAA41032', name: 'Organizational Behaviour', category: 'Elective', programmeId: accountingProgramme.id },
    { code: 'BSAA41043', name: 'Corporate Finance & Risk Management', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA41054', name: 'Internship in Accounting III', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA41063', name: 'Business Intelligence', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA41073', name: 'Business Analytics', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA41083', name: 'Information Security & Fraud Analytics', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA41093', name: 'Forensic Accounting', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA41103', name: 'Security Analysis & Business Valuation', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA41113', name: 'Financial Modeling & Forecasting', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA42012', name: 'Contemporary Issues in Accounting', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA42023', name: 'Strategic Management', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA42036', name: 'Dissertation', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BSAA42044', name: 'Internship in Accounting IV', category: 'Core', programmeId: accountingProgramme.id },
  ];

  for (const s of subjectData) {
    await prisma.subject.upsert({
      where: { code_programmeId: { code: s.code, programmeId: s.programmeId } },
      update: {},
      create: s,
    });
  }

  // Batches
  await prisma.batch.upsert({
    where: { batchNumber_intake: { batchNumber: 'AA22-105', intake: '2022-01' } },
    update: {},
    create: { batchNumber: 'AA22-105', programmeId: accountingProgramme.id, intake: '2022-01' },
  });

  await prisma.batch.upsert({
    where: { batchNumber_intake: { batchNumber: 'AA23-201', intake: '2023-01' } },
    update: {},
    create: { batchNumber: 'AA23-201', programmeId: accountingProgramme.id, intake: '2023-01' },
  });

  await prisma.batch.upsert({
    where: { batchNumber_intake: { batchNumber: 'BMBA23-001', intake: '2023-01' } },
    update: {},
    create: { batchNumber: 'BMBA23-001', programmeId: bmbaProgram.id, intake: '2023-01' },
  });

  // Student user
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: { email: 'student@example.com', password: null },
  });

  await prisma.student.upsert({
    where: { registrationNumber: 'AA22-105-001' },
    update: {},
    create: {
      batchNumber: 'AA22-105',
      nic: '200012345678',
      fullName: 'JOHN DOE',
      nameWithInitials: 'J. Doe',
      permanentAddress: '123 Main Street, Colombo 07',
      postalAddress: '123 Main Street, Colombo 07',
      telephone: '0112345678',
      mobile: '0712345678',
      email: 'john@example.com',
      registrationNumber: 'AA22-105-001',
      intake: '2022-01',
      userId: studentUser.id,
    },
  });

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

  console.log('✅ Seed completed!\n');
  console.log('📝 Test Credentials:');
  console.log('  Student - Batch: AA22-105  NIC: 200012345678');
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

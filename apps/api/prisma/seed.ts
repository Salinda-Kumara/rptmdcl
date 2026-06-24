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

  // Roles
  const studentRole = await prisma.role.upsert({
    where: { name: 'STUDENT' },
    update: {},
    create: { name: 'STUDENT', description: 'Student user role' },
  });

  const financeRole = await prisma.role.upsert({
    where: { name: 'FINANCE_OFFICER' },
    update: {},
    create: { name: 'FINANCE_OFFICER', description: 'Finance officer role' },
  });

  const verificationRole = await prisma.role.upsert({
    where: { name: 'VERIFICATION_OFFICER' },
    update: {},
    create: { name: 'VERIFICATION_OFFICER', description: 'Verification officer role' },
  });

  const examManagerRole = await prisma.role.upsert({
    where: { name: 'EXAM_MANAGER' },
    update: {},
    create: { name: 'EXAM_MANAGER', description: 'Examination manager role' },
  });

  const registrarRole = await prisma.role.upsert({
    where: { name: 'REGISTRAR' },
    update: {},
    create: { name: 'REGISTRAR', description: 'Registrar role' },
  });

  const directorRole = await prisma.role.upsert({
    where: { name: 'DIRECTOR' },
    update: {},
    create: { name: 'DIRECTOR', description: 'Director role' },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Master administrator role' },
  });

  // Permissions
  const createApplicationPerm = await prisma.permission.upsert({
    where: { name: 'application.create' },
    update: {},
    create: { name: 'application.create', description: 'Can create applications' },
  });

  const viewApplicationPerm = await prisma.permission.upsert({
    where: { name: 'application.view' },
    update: {},
    create: { name: 'application.view', description: 'Can view applications' },
  });

  const approveApplicationPerm = await prisma.permission.upsert({
    where: { name: 'application.approve' },
    update: {},
    create: { name: 'application.approve', description: 'Can approve applications' },
  });

  const verifyPaymentPerm = await prisma.permission.upsert({
    where: { name: 'payment.verify' },
    update: {},
    create: { name: 'payment.verify', description: 'Can verify payments' },
  });

  const scheduleCreatePerm = await prisma.permission.upsert({
    where: { name: 'schedule.create' },
    update: {},
    create: { name: 'schedule.create', description: 'Can create schedules' },
  });

  const reportViewPerm = await prisma.permission.upsert({
    where: { name: 'report.view' },
    update: {},
    create: { name: 'report.view', description: 'Can view reports' },
  });

  const userManagePerm = await prisma.permission.upsert({
    where: { name: 'user.manage' },
    update: {},
    create: { name: 'user.manage', description: 'Can manage users' },
  });

  // Link Permissions to Roles
  const rolePermissions = [
    { roleId: studentRole.id, permissionId: createApplicationPerm.id },
    { roleId: studentRole.id, permissionId: viewApplicationPerm.id },
    { roleId: financeRole.id, permissionId: verifyPaymentPerm.id },
    { roleId: financeRole.id, permissionId: viewApplicationPerm.id },
    { roleId: verificationRole.id, permissionId: approveApplicationPerm.id },
    { roleId: verificationRole.id, permissionId: viewApplicationPerm.id },
    { roleId: examManagerRole.id, permissionId: approveApplicationPerm.id },
    { roleId: examManagerRole.id, permissionId: scheduleCreatePerm.id },
    { roleId: examManagerRole.id, permissionId: viewApplicationPerm.id },
    { roleId: registrarRole.id, permissionId: approveApplicationPerm.id },
    { roleId: registrarRole.id, permissionId: reportViewPerm.id },
    { roleId: directorRole.id, permissionId: approveApplicationPerm.id },
    { roleId: directorRole.id, permissionId: reportViewPerm.id },
    { roleId: directorRole.id, permissionId: userManagePerm.id },
    { roleId: adminRole.id, permissionId: createApplicationPerm.id },
    { roleId: adminRole.id, permissionId: viewApplicationPerm.id },
    { roleId: adminRole.id, permissionId: approveApplicationPerm.id },
    { roleId: adminRole.id, permissionId: verifyPaymentPerm.id },
    { roleId: adminRole.id, permissionId: scheduleCreatePerm.id },
    { roleId: adminRole.id, permissionId: reportViewPerm.id },
    { roleId: adminRole.id, permissionId: userManagePerm.id },
  ];

  for (const rp of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: rp.roleId, permissionId: rp.permissionId } },
      update: {},
      create: rp,
    });
  }

  // Subjects
  const subjectData = [
    { code: 'ACC101', name: 'Accounting Principles', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'ACC102', name: 'Financial Accounting', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'ACC103', name: 'Management Accounting', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'ACC104', name: 'Audit and Assurance', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'ACC105', name: 'Taxation', category: 'Core', programmeId: accountingProgramme.id },
    { code: 'BUS101', name: 'Business Analytics', category: 'Core', programmeId: bmbaProgram.id },
    { code: 'BUS102', name: 'Data Science', category: 'Core', programmeId: bmbaProgram.id },
    { code: 'BUS103', name: 'Statistical Methods', category: 'Core', programmeId: bmbaProgram.id },
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

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: studentUser.id, roleId: studentRole.id } },
    update: {},
    create: { userId: studentUser.id, roleId: studentRole.id },
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

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: financeUser.id, roleId: financeRole.id } },
    update: {},
    create: { userId: financeUser.id, roleId: financeRole.id },
  });

  await prisma.staffUser.upsert({
    where: { userId: financeUser.id },
    update: {},
    create: { userId: financeUser.id, name: 'Finance Officer', position: 'Finance Officer' },
  });

  // Verification Officer
  const verificationUser = await prisma.user.upsert({
    where: { email: 'verification@example.com' },
    update: { password },
    create: { email: 'verification@example.com', password },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: verificationUser.id, roleId: verificationRole.id } },
    update: {},
    create: { userId: verificationUser.id, roleId: verificationRole.id },
  });

  await prisma.staffUser.upsert({
    where: { userId: verificationUser.id },
    update: {},
    create: { userId: verificationUser.id, name: 'Verification Officer', position: 'Verification Officer' },
  });

  // Exam Manager
  const examManagerUser = await prisma.user.upsert({
    where: { email: 'exammanager@example.com' },
    update: { password },
    create: { email: 'exammanager@example.com', password },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: examManagerUser.id, roleId: examManagerRole.id } },
    update: {},
    create: { userId: examManagerUser.id, roleId: examManagerRole.id },
  });

  await prisma.staffUser.upsert({
    where: { userId: examManagerUser.id },
    update: {},
    create: { userId: examManagerUser.id, name: 'Exam Manager', position: 'Exam Manager' },
  });

  // Master Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { password },
    create: { email: 'admin@example.com', password },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
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

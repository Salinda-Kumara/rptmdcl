import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Seed Programmes
    console.log('📚 Creating programmes...');
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

    // Seed Batches
    console.log('👥 Creating batches...');
    await prisma.batch.upsert({
      where: { batchNumber_intake: { batchNumber: 'AA22-105', intake: '2022-01' } },
      update: {},
      create: {
        batchNumber: 'AA22-105',
        intake: '2022-01',
        programmeId: accountingProgramme.id,
      },
    });

    // Seed Roles
    console.log('🔐 Creating roles...');
    const studentRole = await prisma.role.upsert({
      where: { name: 'STUDENT' },
      update: {},
      create: { name: 'STUDENT', description: 'Student user' },
    });

    const financeRole = await prisma.role.upsert({
      where: { name: 'FINANCE_OFFICER' },
      update: {},
      create: { name: 'FINANCE_OFFICER', description: 'Finance officer' },
    });

    const verificationRole = await prisma.role.upsert({
      where: { name: 'VERIFICATION_OFFICER' },
      update: {},
      create: { name: 'VERIFICATION_OFFICER', description: 'Verification officer' },
    });

    // Seed Permissions
    console.log('✅ Creating permissions...');
    const permissions = [
      { name: 'CREATE_APPLICATION', description: 'Can create applications' },
      { name: 'VIEW_APPLICATION', description: 'Can view applications' },
      { name: 'EDIT_APPLICATION', description: 'Can edit applications' },
      { name: 'APPROVE_APPLICATION', description: 'Can approve applications' },
      { name: 'VERIFY_PAYMENT', description: 'Can verify payments' },
    ];

    for (const perm of permissions) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm,
      });
    }

    // Create Student User
    console.log('👨‍🎓 Creating student user...');
    const hashedPassword = await argon2.hash('password123', {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const studentUser = await prisma.user.upsert({
      where: { email: 'student@example.com' },
      update: {},
      create: {
        email: 'student@example.com',
        password: null,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: studentUser.id, roleId: studentRole.id } },
      update: {},
      create: {
        userId: studentUser.id,
        roleId: studentRole.id,
      },
    });

    // Create Finance Officer User
    console.log('💼 Creating finance officer...');
    const financeUser = await prisma.user.upsert({
      where: { email: 'finance@example.com' },
      update: {
        password: hashedPassword,
      },
      create: {
        email: 'finance@example.com',
        password: hashedPassword,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: financeUser.id, roleId: financeRole.id } },
      update: {},
      create: {
        userId: financeUser.id,
        roleId: financeRole.id,
      },
    });

    // Create Verification Officer User
    console.log('✔️ Creating verification officer...');
    const verificationUser = await prisma.user.upsert({
      where: { email: 'verification@example.com' },
      update: {
        password: hashedPassword,
      },
      create: {
        email: 'verification@example.com',
        password: hashedPassword,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: verificationUser.id, roleId: verificationRole.id } },
      update: {},
      create: {
        userId: verificationUser.id,
        roleId: verificationRole.id,
      },
    });

    console.log('\n✅ Database seeded successfully!\n');
    console.log('Test Credentials:');
    console.log('================\n');
    console.log('Finance Officer:');
    console.log('  Email: finance@example.com');
    console.log('  Password: password123\n');
    console.log('Verification Officer:');
    console.log('  Email: verification@example.com');
    console.log('  Password: password123\n');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();

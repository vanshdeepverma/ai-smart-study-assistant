import { prisma } from '../src/utils/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Starting development seed...');

  const defaultPassword = process.env.ADMIN_PASSWORD || 'SecurePassword123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  // 1. Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartstudy.com' },
    update: {},
    create: {
      email: 'admin@smartstudy.com',
      name: 'System Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log(`Created admin: ${admin.name}`);

  // 2. Create Test Student
  const student = await prisma.user.upsert({
    where: { email: 'student@smartstudy.com' },
    update: {},
    create: {
      email: 'student@smartstudy.com',
      name: 'Test Student',
      passwordHash,
      role: 'USER',
      xp: 150,
      level: 2,
      currentStreak: 3,
    },
  });
  console.log(`Created student: ${student.name}`);

  // 3. Create Subjects & Topics
  const computerScience = await prisma.subject.create({
    data: {
      name: 'Computer Science',
      description: 'Core CS concepts',
      userId: student.id,
      topics: {
        create: [
          { name: 'Machine Learning' },
          { name: 'Data Structures' },
        ],
      },
    },
    include: { topics: true },
  });
  console.log(`Created subject: ${computerScience.name}`);

  const math = await prisma.subject.create({
    data: {
      name: 'Mathematics',
      description: 'Calculus and Linear Algebra',
      userId: student.id,
      topics: {
        create: [
          { name: 'Linear Algebra' },
          { name: 'Calculus' },
        ],
      },
    },
    include: { topics: true },
  });
  console.log(`Created subject: ${math.name}`);

  // 4. Create Sample Document
  const mlTopic = computerScience.topics.find(t => t.name === 'Machine Learning');
  if (mlTopic) {
    const document = await prisma.document.create({
      data: {
        userId: student.id,
        topicId: mlTopic.id,
        filename: 'Intro_to_ML.pdf',
        fileUrl: '/uploads/intro_to_ml.pdf',
        status: 'READY',
        metadata: { pages: 12, author: 'Andrew Ng' },
      },
    });
    console.log(`Created document: ${document.filename}`);

    // Create some topic performance tracking
    await prisma.topicPerformance.create({
      data: {
        userId: student.id,
        topicId: mlTopic.id,
        masteryLevel: 45.5,
      },
    });
  }

  // 5. Create a Study Session
  await prisma.studySession.create({
    data: {
      userId: student.id,
      duration: 45,
      startTime: new Date(Date.now() - 45 * 60000), // 45 mins ago
      endTime: new Date(),
    },
  });
  console.log(`Created study session for student`);

  console.log('Seed completed successfully! 🌱');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

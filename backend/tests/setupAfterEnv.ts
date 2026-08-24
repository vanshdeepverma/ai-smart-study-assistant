import { prisma } from '../src/utils/db';

afterAll(async () => {
  await prisma.$disconnect();
});

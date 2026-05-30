import { getPrismaClient } from '../src/utils/prismaClient';

(async () => {
  const prisma = getPrismaClient();
  try {
    const r = await prisma.$queryRawUnsafe(`SELECT to_regclass('public."AuditLogs"')::text as t`);
    console.log('raw result:', r);
  } catch (e) {
    console.error('error:', e);
  } finally {
    await prisma.$disconnect();
  }
})();



import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/spendy_db?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) as any } as any);

async function updateAdminPassword() {
  try {
    const newPassword = 'passadmin';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { username: 'admin' },
      data: { password: hashedPassword },
    });

    console.log(`✓ Admin password updated successfully`);
    console.log(`  Username: ${updatedUser.username}`);
    console.log(`  Email: ${updatedUser.email}`);

    // Verify the password works
    const isValid = await bcrypt.compare(newPassword, updatedUser.password);
    console.log(`  Password verification: ${isValid ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword();




import "dotenv/config";
import { getPrismaClient } from "../src/utils/prismaClient";

const prisma = getPrismaClient();

const permissions = [
  { name: "read:expenses", description: "Read expenses" },
  { name: "create:expenses", description: "Create expenses" },
  { name: "update:expenses", description: "Update expenses" },
  { name: "delete:expenses", description: "Delete expenses" },
  { name: "manage:users", description: "Manage users" },
] as const;

async function main() {
  console.log("🌱 Starting database seeding...");

  const permissionRecords = await Promise.all(
    permissions.map((permission) =>
      prisma.permission.upsert({
        where: { name: permission.name },
        update: { description: permission.description },
        create: permission,
      }),
    ),
  );

  const permissionMap = new Map(permissionRecords.map((permission) => [permission.name, permission.id]));

  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: { description: "Administrator role with full permissions" },
    create: { name: "admin", description: "Administrator role with full permissions" },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "user" },
    update: { description: "Regular user role with limited permissions" },
    create: { name: "user", description: "Regular user role with limited permissions" },
  });

  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: [adminRole.id, userRole.id] } },
  });

  await prisma.rolePermission.createMany({
    data: [
      "read:expenses",
      "create:expenses",
      "update:expenses",
      "delete:expenses",
      "manage:users",
    ].map((permissionName) => ({
      roleId: adminRole.id,
      permissionId: permissionMap.get(permissionName)!,
    })).concat(
      ["read:expenses", "create:expenses", "update:expenses"].map((permissionName) => ({
        roleId: userRole.id,
        permissionId: permissionMap.get(permissionName)!,
      })),
    ),
    skipDuplicates: true,
  });

  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      email: "admin@spendy.com",
      password: "passadmin",
      roleId: adminRole.id,
    },
    create: {
      username: "admin",
      password: "passadmin",
      email: "admin@spendy.com",
      roleId: adminRole.id,
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  console.log("✅ Database seeding completed successfully!");
  console.log({
    permissions: permissionRecords,
    roles: [adminRole, userRole],
    users: [adminUser],
  });
}

main()
  .catch((error) => {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




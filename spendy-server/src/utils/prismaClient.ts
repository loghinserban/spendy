import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let client: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === "test") {
    // In tests we use mocked Prisma clients passed into services. Return a dummy object to avoid runtime errors when modules import this file.
    return {} as PrismaClient;
  }

  if (!client) {
    const connectionString =
      process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/spendy_db?schema=public";

    // Create PrismaClient with the Postgres adapter
    client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) as any } as any);
  }

  return client;
}


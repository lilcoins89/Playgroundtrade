import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString:
      process.env.PRISMA_DATABASE_URL ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL,
  });

const adapter = new PrismaPg(pool);
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (import.meta.env?.DEV) {
  globalForPrisma.pool = pool;
}

if (import.meta.env?.DEV) {
  globalForPrisma.prisma = prisma;
}

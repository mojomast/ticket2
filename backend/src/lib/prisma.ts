import { PrismaClient } from '@prisma/client';
import { serializePrismaDecimals } from './decimal.js';

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

  return client.$extends({
    query: {
      $allOperations: async ({ args, query }) => {
        const result = await query(args);
        return serializePrismaDecimals(result);
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

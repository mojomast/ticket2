import { z } from 'zod';

export const createBackupSchema = z.object({
  type: z.enum(['FULL', 'PARTIAL']).default('FULL'),
  tables: z.array(z.string()).optional(),
});

export const backupListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'RESTORED']).optional(),
});

export type CreateBackupInput = z.infer<typeof createBackupSchema>;

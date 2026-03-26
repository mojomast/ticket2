import { z } from 'zod';

export const createMessageSchema = z.object({
  content: z.string().min(1, 'Le message est requis').max(10000),
  isInternal: z.boolean().default(false),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1, 'Le message est requis').max(10000),
});

export const messageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;

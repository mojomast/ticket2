import { z } from 'zod';

// ─── KB Article ───

export const createArticleSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(300),
  content: z.string().min(1, 'Le contenu est requis').max(50000),
  category: z.enum(['MATERIEL', 'LOGICIEL', 'RESEAU', 'PROCEDURE', 'FAQ', 'AUTRE']).default('AUTRE'),
  tags: z.array(z.string().max(50)).max(20).optional(),
  visibility: z.enum(['INTERNAL', 'PUBLIC']).default('INTERNAL'),
});

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.string().min(1).max(50000).optional(),
  category: z.enum(['MATERIEL', 'LOGICIEL', 'RESEAU', 'PROCEDURE', 'FAQ', 'AUTRE']).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  visibility: z.enum(['INTERNAL', 'PUBLIC']).optional(),
});

export const articleListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.enum(['MATERIEL', 'LOGICIEL', 'RESEAU', 'PROCEDURE', 'FAQ', 'AUTRE']).optional(),
  visibility: z.enum(['INTERNAL', 'PUBLIC']).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── KB Article Links ───

export const createLinkSchema = z.object({
  articleId: z.string().uuid('ID article invalide'),
  entityType: z.enum(['TICKET', 'WORKORDER', 'CUSTOMER']),
  entityId: z.string().uuid('ID entité invalide'),
});

export const linkListQuerySchema = z.object({
  entityType: z.enum(['TICKET', 'WORKORDER', 'CUSTOMER']),
  entityId: z.string().uuid('ID entité invalide'),
});

export const articleLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Customer Notes ───

export const createCustomerNoteSchema = z.object({
  customerId: z.string().uuid('ID client invalide'),
  content: z.string().min(1, 'Le contenu est requis').max(10000),
  isPinned: z.boolean().default(false),
});

export const updateCustomerNoteSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  isPinned: z.boolean().optional(),
});

export const customerNoteListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  customerId: z.string().uuid('ID client invalide'),
});

// ─── Type exports ───

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type ArticleListQuery = z.infer<typeof articleListQuerySchema>;
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type LinkListQuery = z.infer<typeof linkListQuerySchema>;
export type CreateCustomerNoteInput = z.infer<typeof createCustomerNoteSchema>;
export type UpdateCustomerNoteInput = z.infer<typeof updateCustomerNoteSchema>;
export type CustomerNoteListQuery = z.infer<typeof customerNoteListQuerySchema>;

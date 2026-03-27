import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { getPagination, buildPaginatedResponse } from '../types/index.js';
import type {
  CreateArticleInput,
  UpdateArticleInput,
  ArticleListQuery,
  CreateLinkInput,
} from '../validations/knowledgebase.js';
import { createAuditLog } from './audit.service.js';

// ─── Shared Prisma includes ───

const AUTHOR_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
};

const ARTICLE_INCLUDE = {
  author: { select: AUTHOR_SELECT },
};

const ARTICLE_DETAIL_INCLUDE = {
  author: { select: AUTHOR_SELECT },
  links: {
    include: {
      linkedBy: { select: AUTHOR_SELECT },
    },
  },
};

// ─── Slug Helpers ───

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = generateSlug(title);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.kbArticle.findFirst({
      where: {
        slug: candidate,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return candidate;

    candidate = `${base}-${suffix}`.substring(0, 100);
    suffix++;
  }
}

// ─── CRUD ───

export async function createArticle(input: CreateArticleInput, authorId: string) {
  const slug = await generateUniqueSlug(input.title);

  const article = await prisma.kbArticle.create({
    data: {
      title: input.title,
      slug,
      content: input.content,
      category: input.category,
      tags: input.tags ?? Prisma.JsonNull,
      visibility: input.visibility,
      authorId,
    },
    include: ARTICLE_INCLUDE,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'KB_ARTICLE',
    entityId: article.id,
    action: 'CREATE',
    userId: authorId,
    newValue: { title: input.title, slug, category: input.category, visibility: input.visibility },
  }).catch(() => {});

  return article;
}

export async function updateArticle(id: string, input: UpdateArticleInput, userId: string) {
  const existing = await prisma.kbArticle.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) throw AppError.notFound('Article introuvable');

  const data: Record<string, unknown> = {};

  if (input.title !== undefined) {
    data.title = input.title;
    data.slug = await generateUniqueSlug(input.title, id);
  }
  if (input.content !== undefined) data.content = input.content;
  if (input.category !== undefined) data.category = input.category;
  if (input.tags !== undefined) data.tags = input.tags ?? Prisma.JsonNull;
  if (input.visibility !== undefined) data.visibility = input.visibility;

  const article = await prisma.kbArticle.update({
    where: { id },
    data,
    include: ARTICLE_INCLUDE,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'KB_ARTICLE',
    entityId: id,
    action: 'UPDATE',
    userId,
    oldValue: { title: existing.title, slug: existing.slug, category: existing.category, visibility: existing.visibility },
    newValue: data,
  }).catch(() => {});

  return article;
}

export async function getArticle(id: string, userRole?: string) {
  const article = await prisma.kbArticle.findFirst({
    where: { id, deletedAt: null },
    include: ARTICLE_DETAIL_INCLUDE,
  });

  if (!article) throw AppError.notFound('Article introuvable');

  // Customers can only see PUBLIC articles
  if (userRole === 'CUSTOMER' && article.visibility !== 'PUBLIC') {
    throw AppError.forbidden('Article non accessible');
  }

  return article;
}

export async function getArticleBySlug(slug: string, userRole?: string) {
  const article = await prisma.kbArticle.findFirst({
    where: { slug, deletedAt: null },
    include: ARTICLE_DETAIL_INCLUDE,
  });

  if (!article) throw AppError.notFound('Article introuvable');

  if (userRole === 'CUSTOMER' && article.visibility !== 'PUBLIC') {
    throw AppError.forbidden('Article non accessible');
  }

  return article;
}

export async function listArticles(query: ArticleListQuery, userRole?: string) {
  const { page, limit, skip } = getPagination({ page: query.page, limit: query.limit });

  const where: Prisma.KbArticleWhereInput = { deletedAt: null };

  if (query.category) where.category = query.category;
  if (query.visibility) where.visibility = query.visibility;
  // Customers can only see PUBLIC articles
  if (userRole === 'CUSTOMER') where.visibility = 'PUBLIC';
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { content: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [articles, total] = await Promise.all([
    prisma.kbArticle.findMany({
      where,
      include: ARTICLE_INCLUDE,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip,
      take: limit,
    }),
    prisma.kbArticle.count({ where }),
  ]);

  return buildPaginatedResponse(articles, total, page, limit);
}

export async function deleteArticle(id: string, userId: string) {
  const article = await prisma.kbArticle.findFirst({
    where: { id, deletedAt: null },
  });

  if (!article) throw AppError.notFound('Article introuvable');

  await prisma.kbArticle.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'KB_ARTICLE',
    entityId: id,
    action: 'DELETE',
    userId,
    oldValue: { title: article.title, slug: article.slug },
  }).catch(() => {});
}

// ─── Article Links ───

export async function linkArticle(input: CreateLinkInput, linkedById: string) {
  // Verify article exists and is not soft-deleted
  const article = await prisma.kbArticle.findFirst({
    where: { id: input.articleId, deletedAt: null },
    select: { id: true },
  });
  if (!article) throw AppError.notFound('Article introuvable');

  try {
    const link = await prisma.kbArticleLink.create({
      data: {
        articleId: input.articleId,
        entityType: input.entityType,
        entityId: input.entityId,
        linkedById,
      },
      include: {
        article: true,
        linkedBy: { select: AUTHOR_SELECT },
      },
    });

    return link;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw AppError.badRequest('Ce lien existe déjà');
    }
    throw error;
  }
}

export async function unlinkArticle(linkId: string, userId: string) {
  const link = await prisma.kbArticleLink.findUnique({
    where: { id: linkId },
  });

  if (!link) throw AppError.notFound('Lien introuvable');

  await prisma.kbArticleLink.delete({
    where: { id: linkId },
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'KB_ARTICLE',
    entityId: link.articleId,
    action: 'UNLINK',
    userId,
    oldValue: { linkId, entityType: link.entityType, entityId: link.entityId },
  }).catch(() => {});
}

export async function getLinksForEntity(entityType: string, entityId: string) {
  const links = await prisma.kbArticleLink.findMany({
    where: {
      entityType: entityType as Prisma.EnumKbLinkEntityTypeFilter['equals'],
      entityId,
      article: { deletedAt: null },
    },
    include: {
      article: {
        include: { author: { select: AUTHOR_SELECT } },
      },
    },
  });

  return links;
}

export async function getLinksForArticle(articleId: string, page: number, limit: number) {
  // Verify article exists and is not soft-deleted
  const article = await prisma.kbArticle.findFirst({
    where: { id: articleId, deletedAt: null },
    select: { id: true },
  });
  if (!article) throw AppError.notFound('Article introuvable');

  const { page: safePage, limit: safeLimit, skip } = getPagination({ page, limit });

  const where: Prisma.KbArticleLinkWhereInput = { articleId };

  const [links, total] = await Promise.all([
    prisma.kbArticleLink.findMany({
      where,
      include: {
        linkedBy: { select: AUTHOR_SELECT },
      },
      skip,
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.kbArticleLink.count({ where }),
  ]);

  return buildPaginatedResponse(links, total, safePage, safeLimit);
}

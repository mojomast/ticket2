import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { getPagination, buildPaginatedResponse } from '../types/index.js';
import type {
  CreateCustomerNoteInput,
  UpdateCustomerNoteInput,
  CustomerNoteListQuery,
} from '../validations/knowledgebase.js';
import { createAuditLog } from './audit.service.js';

// ─── Shared Prisma includes ───

const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
};

const NOTE_INCLUDE = {
  author: { select: AUTHOR_SELECT },
};

// ─── CRUD ───

export async function createNote(input: CreateCustomerNoteInput, authorId: string) {
  const customer = await prisma.user.findFirst({
    where: { id: input.customerId, role: 'CUSTOMER', deletedAt: null },
    select: { id: true },
  });

  if (!customer) throw AppError.notFound('Client non trouvé');

  const note = await prisma.customerNote.create({
    data: {
      customerId: input.customerId,
      authorId,
      content: input.content,
      isPinned: input.isPinned ?? false,
    },
    include: NOTE_INCLUDE,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'CUSTOMER_NOTE',
    entityId: note.id,
    action: 'CREATE',
    userId: authorId,
    newValue: { customerId: input.customerId, content: input.content, isPinned: note.isPinned },
  }).catch(() => {});

  return note;
}

export async function updateNote(id: string, input: UpdateCustomerNoteInput, userId: string) {
  const existing = await prisma.customerNote.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) throw AppError.notFound('Note introuvable');

  const data: Record<string, unknown> = {};

  if (input.content !== undefined) data.content = input.content;
  if (input.isPinned !== undefined) data.isPinned = input.isPinned;

  const note = await prisma.customerNote.update({
    where: { id },
    data,
    include: NOTE_INCLUDE,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'CUSTOMER_NOTE',
    entityId: id,
    action: 'UPDATE',
    userId,
    oldValue: { content: existing.content, isPinned: existing.isPinned },
    newValue: data,
  }).catch(() => {});

  return note;
}

export async function deleteNote(id: string, userId: string) {
  const note = await prisma.customerNote.findFirst({
    where: { id, deletedAt: null },
  });

  if (!note) throw AppError.notFound('Note introuvable');

  await prisma.customerNote.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'CUSTOMER_NOTE',
    entityId: id,
    action: 'DELETE',
    userId,
    oldValue: { content: note.content, isPinned: note.isPinned },
  }).catch(() => {});
}

export async function listNotes(query: CustomerNoteListQuery) {
  const { page, limit, skip } = getPagination({ page: query.page, limit: query.limit });

  const where: Prisma.CustomerNoteWhereInput = {
    customerId: query.customerId,
    deletedAt: null,
  };

  const [notes, total] = await Promise.all([
    prisma.customerNote.findMany({
      where,
      include: NOTE_INCLUDE,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.customerNote.count({ where }),
  ]);

  return buildPaginatedResponse(notes, total, page, limit);
}

export async function togglePin(id: string, userId: string) {
  const existing = await prisma.customerNote.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) throw AppError.notFound('Note introuvable');

  const note = await prisma.customerNote.update({
    where: { id },
    data: { isPinned: !existing.isPinned },
    include: NOTE_INCLUDE,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'CUSTOMER_NOTE',
    entityId: id,
    action: 'PIN_TOGGLE',
    userId,
    oldValue: { isPinned: existing.isPinned },
    newValue: { isPinned: note.isPinned },
  }).catch(() => {});

  return note;
}

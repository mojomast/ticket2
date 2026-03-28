import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { UserRole } from '@prisma/client';
import { getTicketAccessContext } from './ticket.service.js';

// ─── Constants ───

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // PDFs
  'application/pdf',
  // Documents
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Text
  'text/plain',
  'text/csv',
  // Archives (useful for logs, configs)
  'application/zip',
]);

/** Resolve the uploads directory (backend/uploads/) */
function getUploadsDir(): string {
  // __dirname equivalent for ESM: use import.meta — but we compute from cwd for reliability
  return path.resolve(process.cwd(), 'uploads');
}

/** Ensure the uploads directory exists */
async function ensureUploadsDir(): Promise<string> {
  const dir = getUploadsDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

// ─── Attachment include for queries ───

const ATTACHMENT_INCLUDE = {
  uploader: {
    select: { id: true, firstName: true, lastName: true, role: true, email: true },
  },
};

// ─── Service Functions ───

/**
 * Upload a file attachment to a ticket.
 * Saves the file to disk with a UUID filename, then creates an Attachment record.
 */
export async function uploadAttachment(
  file: File,
  userId: string,
  role: UserRole,
  ticketId: string,
  messageId?: string,
) {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw AppError.badRequest(
      `Le fichier est trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)`,
    );
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw AppError.badRequest(
      `Type de fichier non autorisé: ${file.type}. Types acceptés: images, PDF, documents, texte.`,
    );
  }

  await getTicketAccessContext(ticketId, userId, role);

  // Verify message exists if provided
  if (messageId) {
    const message = await prisma.message.findFirst({
      where: { id: messageId, ticketId, deletedAt: null },
    });
    if (!message) {
      throw AppError.notFound('Message introuvable');
    }
  }

  // Generate a unique filename preserving the extension
  const ext = path.extname(file.name) || '';
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const uploadsDir = await ensureUploadsDir();
  const filePath = path.join(uploadsDir, uniqueName);

  // Write file to disk
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  logger.info({ fileName: file.name, size: file.size, mimeType: file.type, ticketId }, 'File uploaded to disk');

  // Create database record
  const attachment = await prisma.attachment.create({
    data: {
      ticketId,
      messageId: messageId || null,
      uploadedBy: userId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      storagePath: uniqueName, // relative to uploads dir
    },
    include: ATTACHMENT_INCLUDE,
  });

  return attachment;
}

/**
 * Get a single attachment by ID.
 */
export async function getAttachment(id: string) {
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: ATTACHMENT_INCLUDE,
  });
  if (!attachment) {
    throw AppError.notFound('Pièce jointe introuvable');
  }
  return attachment;
}

export async function getAttachmentForUser(id: string, userId: string, role: UserRole) {
  const attachment = await getAttachment(id);

  await getTicketAccessContext(attachment.ticketId, userId, role);

  return attachment;
}

/**
 * Get the full file path for an attachment (for download/streaming).
 */
export function getAttachmentFilePath(storagePath: string): string {
  return path.join(getUploadsDir(), storagePath);
}

/**
 * List all attachments for a ticket.
 */
export async function getAttachmentsByTicket(ticketId: string, userId: string, role: UserRole) {
  await getTicketAccessContext(ticketId, userId, role);

  const attachments = await prisma.attachment.findMany({
    where: { ticketId },
    include: ATTACHMENT_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  return attachments;
}

/**
 * Delete an attachment (file + record).
 * Only the uploader or an ADMIN can delete.
 */
export async function deleteAttachment(id: string, userId: string, role: UserRole) {
  const attachment = await prisma.attachment.findUnique({
    where: { id },
  });
  if (!attachment) {
    throw AppError.notFound('Pièce jointe introuvable');
  }

  await getTicketAccessContext(attachment.ticketId, userId, role);

  // Authorization: only admin or the uploader can delete
  if (role !== 'ADMIN' && attachment.uploadedBy !== userId) {
    throw AppError.forbidden('Seul l\'auteur ou un administrateur peut supprimer cette pièce jointe');
  }

  // Delete file from disk
  const filePath = path.join(getUploadsDir(), attachment.storagePath);
  try {
    await unlink(filePath);
    logger.info({ id, storagePath: attachment.storagePath }, 'File deleted from disk');
  } catch (err) {
    // File may already be gone — log but don't fail
    logger.warn({ id, storagePath: attachment.storagePath, err }, 'File not found on disk during deletion');
  }

  // Delete database record
  await prisma.attachment.delete({
    where: { id },
  });

  return { message: 'Pièce jointe supprimée' };
}

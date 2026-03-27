import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { hashPassword, verifyPassword } from '../lib/auth.js';
import type { CreateUserInput, UpdateUserInput } from '../validations/user.js';
import { getPagination, buildPaginatedResponse, DEFAULT_TECH_PERMISSIONS } from '../types/index.js';
import { createAuditLog } from './audit.service.js';

const USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true,
  phone: true, role: true, customerType: true, companyName: true,
  address: true, isActive: true, isDemo: true, permissions: true,
  createdAt: true, updatedAt: true,
};

export async function getUsers(query: any) {
  const { page, limit, skip } = getPagination({ page: query.page || 1, limit: query.limit || 20 });

  const where: any = { deletedAt: null };
  if (query.role) where.role = query.role;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { companyName: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: USER_SELECT, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);

  return buildPaginatedResponse(users, total, page, limit);
}

export async function getUserById(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: USER_SELECT,
  });
  if (!user) throw AppError.notFound('Utilisateur introuvable');
  return user;
}

export async function createUser(data: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw AppError.conflict('Un utilisateur avec cet email existe deja');

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role,
      customerType: data.customerType,
      companyName: data.companyName,
      address: data.address,
      permissions: data.role === 'TECHNICIAN'
        ? JSON.parse(JSON.stringify(DEFAULT_TECH_PERMISSIONS))
        : undefined,
    },
    select: USER_SELECT,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'USER',
    entityId: user.id,
    action: 'CREATED',
    userId: user.id,
    newValue: { email: data.email, role: data.role, firstName: data.firstName, lastName: data.lastName },
  }).catch(() => {});

  return user;
}

export async function updateUser(id: string, data: UpdateUserInput) {
  const user = await getUserById(id);

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw AppError.conflict('Un utilisateur avec cet email existe deja');
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: USER_SELECT,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'USER',
    entityId: id,
    action: 'UPDATED',
    userId: id,
    oldValue: { email: user.email, firstName: user.firstName, lastName: user.lastName },
    newValue: data,
  }).catch(() => {});

  return updated;
}

export async function deleteUser(id: string) {
  const user = await getUserById(id);

  const deleted = await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
    select: USER_SELECT,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'USER',
    entityId: id,
    action: 'DELETED',
    userId: id,
    oldValue: { email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
  }).catch(() => {});

  return deleted;
}

export async function updatePermissions(id: string, permissions: any) {
  const user = await getUserById(id);
  if (user.role !== 'TECHNICIAN') {
    throw AppError.badRequest('Seuls les techniciens ont des permissions');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { permissions },
    select: USER_SELECT,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'USER',
    entityId: id,
    action: 'PERMISSIONS_UPDATED',
    userId: id,
    oldValue: { permissions: user.permissions },
    newValue: { permissions },
  }).catch(() => {});

  return updated;
}

export async function updateProfile(id: string, data: any) {
  return prisma.user.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      address: data.address,
    },
    select: USER_SELECT,
  });
}

export async function getProfile(id: string) {
  return getUserById(id);
}

export async function getActiveTechnicians() {
  return prisma.user.findMany({
    where: { role: 'TECHNICIAN', isActive: true, deletedAt: null },
    select: USER_SELECT,
    orderBy: { firstName: 'asc' },
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  // Fetch user with password hash
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, passwordHash: true },
  });
  if (!user) throw AppError.notFound('Utilisateur introuvable');

  // Verify current password
  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) {
    throw AppError.unauthorized('Mot de passe actuel incorrect');
  }

  // Hash and save new password
  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'USER',
    entityId: userId,
    action: 'PASSWORD_CHANGED',
    userId,
  }).catch(() => {});
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { ...USER_SELECT, passwordHash: true },
  });

  if (!user || !user.isActive) {
    throw AppError.unauthorized('Email ou mot de passe invalide');
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    throw AppError.unauthorized('Email ou mot de passe invalide');
  }

  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit avoir au moins 8 caracteres').max(128),
  firstName: z.string().min(1, 'Le prenom est requis').max(100),
  lastName: z.string().min(1, 'Le nom est requis').max(100),
  phone: z.string().max(20).optional(),
  role: z.enum(['CUSTOMER', 'TECHNICIAN', 'ADMIN']),
  customerType: z.enum(['RESIDENTIAL', 'COMMERCIAL']).optional(),
  companyName: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  customerType: z.enum(['RESIDENTIAL', 'COMMERCIAL']).optional().nullable(),
  companyName: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit avoir au moins 8 caracteres').max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit avoir au moins 8 caracteres').max(128),
  confirmPassword: z.string().min(8, 'La confirmation du mot de passe est requise'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export const techPermissionsSchema = z.object({
  can_accept_tickets: z.boolean(),
  can_close_tickets: z.boolean(),
  can_send_quotes: z.boolean(),
  can_cancel_appointments: z.boolean(),
  can_view_all_tickets: z.boolean(),
});

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['CUSTOMER', 'TECHNICIAN', 'ADMIN']).optional(),
  search: z.string().optional(),
  isActive: z.preprocess((v) => v === 'true', z.boolean()).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export const demoLoginSchema = z.object({
  email: z.string().email('Email invalide'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

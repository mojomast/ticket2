import { z } from 'zod';

// ─── Branding validation for PUT /branding ───
export const brandingSchema = z.object({
  companyName: z.string().min(1).max(100).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide (format #RRGGBB)').optional(),
  logoUrl: z.string().url().or(z.literal('')).optional(),
  contactEmail: z.string().email('Courriel invalide').optional(),
  contactPhone: z.string().max(20).optional(),
});

// ─── Generic config value for PUT /:key ───
export const configValueSchema = z.object({
  value: z.unknown(),
});

export type BrandingInput = z.infer<typeof brandingSchema>;
export type ConfigValueInput = z.infer<typeof configValueSchema>;

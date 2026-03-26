import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DEMO_MODE: z.preprocess((v) => v === 'true' || v === '1', z.boolean()).default(false),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Email (M365 Graph)
  M365_TENANT_ID: z.string().optional(),
  M365_CLIENT_ID: z.string().optional(),
  M365_CLIENT_SECRET: z.string().optional(),
  M365_SENDER_EMAIL: z.string().email().optional(),
  // SMS (VoIP.ms)
  VOIPMS_USERNAME: z.string().optional(),
  VOIPMS_PASSWORD: z.string().optional(),
  VOIPMS_DID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadConfig(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();

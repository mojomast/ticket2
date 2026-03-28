import { z } from 'zod';

const booleanFromEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === undefined) return undefined;
    return value === 'true' || value === '1';
  }, z.boolean().default(defaultValue));

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  WORKORDER_DEVICE_PASSWORD_KEY: z.string().min(32, 'WORKORDER_DEVICE_PASSWORD_KEY must be at least 32 characters').optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DEMO_MODE: booleanFromEnv(false),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NOTIFICATION_RETENTION_ENABLED: booleanFromEnv(true),
  NOTIFICATION_RETENTION_READ_DAYS: z.coerce.number().int().min(1).default(30),
  NOTIFICATION_RETENTION_UNREAD_DAYS: z.coerce.number().int().min(1).default(180),
  // Email (M365 Graph)
  M365_TENANT_ID: z.string().optional(),
  M365_CLIENT_ID: z.string().optional(),
  M365_CLIENT_SECRET: z.string().optional(),
  M365_SENDER_EMAIL: z.string().email().optional(),
  // SMS (VoIP.ms)
  VOIPMS_USERNAME: z.string().optional(),
  VOIPMS_PASSWORD: z.string().optional(),
  VOIPMS_DID: z.string().optional(),
}).superRefine((env, ctx) => {
  if (env.NOTIFICATION_RETENTION_UNREAD_DAYS < env.NOTIFICATION_RETENTION_READ_DAYS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['NOTIFICATION_RETENTION_UNREAD_DAYS'],
      message: 'NOTIFICATION_RETENTION_UNREAD_DAYS must be greater than or equal to NOTIFICATION_RETENTION_READ_DAYS',
    });
  }
});

export type Env = z.infer<typeof envSchema>;

function loadConfig(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    if (process.env.NODE_ENV === 'test') {
      return envSchema.parse({
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test',
        AUTH_SECRET:
          process.env.AUTH_SECRET || 'test-secret-for-vitest-at-least-32-chars!',
        WORKORDER_DEVICE_PASSWORD_KEY: process.env.WORKORDER_DEVICE_PASSWORD_KEY,
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
        PORT: process.env.PORT,
        LOG_LEVEL: process.env.LOG_LEVEL,
        DEMO_MODE: process.env.DEMO_MODE,
        NODE_ENV: 'test',
        NOTIFICATION_RETENTION_ENABLED: process.env.NOTIFICATION_RETENTION_ENABLED,
        NOTIFICATION_RETENTION_READ_DAYS: process.env.NOTIFICATION_RETENTION_READ_DAYS,
        NOTIFICATION_RETENTION_UNREAD_DAYS: process.env.NOTIFICATION_RETENTION_UNREAD_DAYS,
        M365_TENANT_ID: process.env.M365_TENANT_ID,
        M365_CLIENT_ID: process.env.M365_CLIENT_ID,
        M365_CLIENT_SECRET: process.env.M365_CLIENT_SECRET,
        M365_SENDER_EMAIL: process.env.M365_SENDER_EMAIL,
        VOIPMS_USERNAME: process.env.VOIPMS_USERNAME,
        VOIPMS_PASSWORD: process.env.VOIPMS_PASSWORD,
        VOIPMS_DID: process.env.VOIPMS_DID,
      });
    }

    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();

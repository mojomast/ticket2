import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';

interface SmsOptions {
  to: string;
  message: string;
}

interface SmsConfig {
  username: string;
  password: string;
  did: string;
}

/** Load SMS config from DB (key: sms_config), fall back to process.env */
async function getSmsConfig(): Promise<SmsConfig | null> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: 'sms_config' } });
    if (row?.value && typeof row.value === 'object') {
      const v = row.value as Record<string, unknown>;
      const username = v.username as string | undefined;
      const password = v.password as string | undefined;
      const did = v.did as string | undefined;
      if (username && password && did) {
        return { username, password, did };
      }
    }
  } catch {
    // DB not available — fall through to env vars
  }

  const username = process.env.VOIPMS_USERNAME;
  const password = process.env.VOIPMS_PASSWORD;
  const did = process.env.VOIPMS_DID;

  if (username && password && did) {
    return { username, password, did };
  }

  return null;
}

// VoIP.ms SMS sending
export async function sendSms(options: SmsOptions): Promise<boolean> {
  const config = await getSmsConfig();

  if (!config) {
    logger.warn('SMS not configured, skipping send');
    return false;
  }

  try {
    const params = new URLSearchParams({
      api_username: config.username,
      api_password: config.password,
      did: config.did,
      dst: options.to.replace(/\D/g, ''),
      message: options.message,
    });

    const response = await fetch(
      `https://voip.ms/api/v1/rest.php?${params}&method=sendSMS`
    );

    const data = await response.json();

    if (data.status !== 'success') {
      throw new Error(`VoIP.ms error: ${data.status}`);
    }

    logger.info({ to: options.to }, 'SMS sent successfully');
    return true;
  } catch (error) {
    logger.error({ error, to: options.to }, 'Failed to send SMS');
    return false;
  }
}

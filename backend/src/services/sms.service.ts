import { logger } from '../lib/logger.js';

interface SmsOptions {
  to: string;
  message: string;
}

// VoIP.ms SMS sending
export async function sendSms(options: SmsOptions): Promise<boolean> {
  const username = process.env.VOIPMS_USERNAME;
  const password = process.env.VOIPMS_PASSWORD;
  const did = process.env.VOIPMS_DID;

  if (!username || !password || !did) {
    logger.warn('SMS not configured, skipping send');
    return false;
  }

  try {
    const params = new URLSearchParams({
      api_username: username,
      api_password: password,
      did,
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

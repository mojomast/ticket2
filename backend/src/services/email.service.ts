import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

interface EmailConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  senderEmail: string;
}

/** Load email config from DB (key: email_config), fall back to process.env */
async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: 'email_config' } });
    if (row?.value && typeof row.value === 'object') {
      const v = row.value as Record<string, unknown>;
      const tenantId = v.tenantId as string | undefined;
      const clientId = v.clientId as string | undefined;
      const clientSecret = v.clientSecret as string | undefined;
      const senderEmail = v.senderEmail as string | undefined;
      if (tenantId && clientId && clientSecret && senderEmail) {
        return { tenantId, clientId, clientSecret, senderEmail };
      }
    }
  } catch {
    // DB not available — fall through to env vars
  }

  const tenantId = process.env.M365_TENANT_ID;
  const clientId = process.env.M365_CLIENT_ID;
  const clientSecret = process.env.M365_CLIENT_SECRET;
  const senderEmail = process.env.M365_SENDER_EMAIL;

  if (tenantId && clientId && clientSecret && senderEmail) {
    return { tenantId, clientId, clientSecret, senderEmail };
  }

  return null;
}

// M365 Graph API email sending
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const config = await getEmailConfig();

  if (!config) {
    logger.warn('Email not configured, skipping send');
    return false;
  }

  try {
    // Get access token
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('Failed to get M365 access token');
    }

    // Send email
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${config.senderEmail}/sendMail`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            subject: options.subject,
            body: {
              contentType: options.isHtml ? 'HTML' : 'Text',
              content: options.body,
            },
            toRecipients: [{ emailAddress: { address: options.to } }],
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`M365 API error: ${response.status} ${err}`);
    }

    logger.info({ to: options.to, subject: options.subject }, 'Email sent successfully');
    return true;
  } catch (error) {
    logger.error({ error, to: options.to }, 'Failed to send email');
    return false;
  }
}

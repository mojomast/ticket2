import { logger } from '../lib/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

// M365 Graph API email sending
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const tenantId = process.env.M365_TENANT_ID;
  const clientId = process.env.M365_CLIENT_ID;
  const clientSecret = process.env.M365_CLIENT_SECRET;
  const senderEmail = process.env.M365_SENDER_EMAIL;

  if (!tenantId || !clientId || !clientSecret || !senderEmail) {
    logger.warn('Email not configured, skipping send');
    return false;
  }

  try {
    // Get access token
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
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
      `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
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

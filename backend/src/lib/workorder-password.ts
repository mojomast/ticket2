import crypto from 'node:crypto';
import { logger } from './logger.js';

const ENCRYPTED_PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getSecretMaterial(): string {
  const explicitKey = process.env.WORKORDER_DEVICE_PASSWORD_KEY?.trim();
  if (explicitKey) return explicitKey;

  const authSecret = process.env.AUTH_SECRET?.trim();
  if (authSecret) return authSecret;

  if (process.env.NODE_ENV !== 'production') {
    return 'valitek-workorder-device-password-dev-fallback';
  }

  throw new Error('Missing WORKORDER_DEVICE_PASSWORD_KEY or AUTH_SECRET for work order password encryption');
}

function getKey(): Buffer {
  return crypto.createHash('sha256').update(getSecretMaterial()).digest();
}

export function isEncryptedWorkOrderPassword(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptWorkOrderPassword(value: string | null | undefined): string | null | undefined {
  if (value == null || value === '') return value;
  if (isEncryptedWorkOrderPassword(value)) return value;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptWorkOrderPassword(value: string | null | undefined): string | null | undefined {
  if (value == null || value === '') return value;
  if (!isEncryptedWorkOrderPassword(value)) return value;

  try {
    const payload = value.slice(ENCRYPTED_PREFIX.length);
    const [ivB64, authTagB64, encryptedB64] = payload.split(':');

    if (!ivB64 || !authTagB64 || !encryptedB64) {
      throw new Error('Invalid encrypted payload format');
    }

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);

    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch (error) {
    logger.error({ err: error }, 'Failed to decrypt work order device password');
    return null;
  }
}

export function decryptWorkOrderRecord<T extends { devicePassword?: string | null }>(record: T): T {
  if (!record || !Object.prototype.hasOwnProperty.call(record, 'devicePassword')) {
    return record;
  }

  return {
    ...record,
    devicePassword: decryptWorkOrderPassword(record.devicePassword),
  };
}

export function decryptWorkOrderRecords<T extends { devicePassword?: string | null }>(records: T[]): T[] {
  return records.map((record) => decryptWorkOrderRecord(record));
}

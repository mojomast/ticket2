import { beforeEach, describe, expect, it } from 'vitest';
import {
  decryptWorkOrderPassword,
  encryptWorkOrderPassword,
  isEncryptedWorkOrderPassword,
} from './workorder-password.js';

describe('workorder-password helpers', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-auth-secret-for-workorder-passwords-123456';
    delete process.env.WORKORDER_DEVICE_PASSWORD_KEY;
    process.env.NODE_ENV = 'test';
  });

  it('encrypts and decrypts device passwords', () => {
    const encrypted = encryptWorkOrderPassword('1234')!;

    expect(encrypted).not.toBe('1234');
    expect(isEncryptedWorkOrderPassword(encrypted)).toBe(true);
    expect(decryptWorkOrderPassword(encrypted)).toBe('1234');
  });

  it('leaves legacy plaintext records readable', () => {
    expect(decryptWorkOrderPassword('legacy-plain-password')).toBe('legacy-plain-password');
  });

  it('uses a dedicated key when configured', () => {
    process.env.WORKORDER_DEVICE_PASSWORD_KEY = 'dedicated-workorder-key-1234567890123456';

    const encrypted = encryptWorkOrderPassword('pin-0000')!;

    expect(decryptWorkOrderPassword(encrypted)).toBe('pin-0000');
  });
});

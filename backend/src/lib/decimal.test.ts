import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  decimalToNumber,
  multiplyToMoneyDecimal,
  serializePrismaDecimals,
  sumMoneyDecimals,
  toMoneyDecimal,
  toRateDecimal,
} from './decimal.js';

describe('decimal helpers', () => {
  it('rounds money and rate values to expected precision', () => {
    expect(toMoneyDecimal(12.345)?.toString()).toBe('12.35');
    expect(toRateDecimal(1.23456)?.toString()).toBe('1.2346');
  });

  it('calculates money totals with decimal arithmetic', () => {
    const lineTotal = multiplyToMoneyDecimal(1.255, 10);
    const grandTotal = sumMoneyDecimals([lineTotal, 2.335]);

    expect(lineTotal.toString()).toBe('12.55');
    expect(grandTotal.toString()).toBe('14.89');
    expect(decimalToNumber(grandTotal)).toBe(14.89);
  });

  it('serializes nested Prisma decimals into numbers', () => {
    const payload = {
      quotedPrice: new Prisma.Decimal('149.99'),
      totals: {
        grandTotal: new Prisma.Decimal('224.50'),
      },
      parts: [{ lineTotal: new Prisma.Decimal('74.51') }],
    };

    expect(serializePrismaDecimals(payload)).toEqual({
      quotedPrice: 149.99,
      totals: { grandTotal: 224.5 },
      parts: [{ lineTotal: 74.51 }],
    });
  });
});

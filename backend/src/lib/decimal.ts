import { Prisma } from '@prisma/client';

export type DecimalLike = Prisma.Decimal | number | string | null | undefined;

const MONEY_SCALE = 2;
const RATE_SCALE = 4;
const ROUNDING_MODE = Prisma.Decimal.ROUND_HALF_UP;

export function isPrismaDecimal(value: unknown): value is Prisma.Decimal {
  return Prisma.Decimal.isDecimal(value);
}

function toDecimal(value: Exclude<DecimalLike, null | undefined>): Prisma.Decimal {
  return isPrismaDecimal(value) ? value : new Prisma.Decimal(value);
}

function roundDecimal(value: Exclude<DecimalLike, null | undefined>, scale: number): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(scale, ROUNDING_MODE);
}

export function toMoneyDecimal(value: DecimalLike): Prisma.Decimal | null | undefined {
  if (value == null) return value;
  return roundDecimal(value, MONEY_SCALE);
}

export function toRequiredMoneyDecimal(value: Exclude<DecimalLike, null | undefined>): Prisma.Decimal {
  return roundDecimal(value, MONEY_SCALE);
}

export function toRateDecimal(value: DecimalLike): Prisma.Decimal | null | undefined {
  if (value == null) return value;
  return roundDecimal(value, RATE_SCALE);
}

export function toRequiredRateDecimal(value: Exclude<DecimalLike, null | undefined>): Prisma.Decimal {
  return roundDecimal(value, RATE_SCALE);
}

export function multiplyToMoneyDecimal(left: DecimalLike, right: DecimalLike): Prisma.Decimal {
  return roundDecimal(toDecimal(left ?? 0).mul(toDecimal(right ?? 0)), MONEY_SCALE);
}

export function sumMoneyDecimals(values: DecimalLike[]): Prisma.Decimal {
  let total = new Prisma.Decimal(0);

  for (const value of values) {
    if (value != null) {
      total = total.add(toDecimal(value));
    }
  }

  return total.toDecimalPlaces(MONEY_SCALE, ROUNDING_MODE);
}

export function decimalToNumber(value: DecimalLike): number | null | undefined {
  if (value == null) return value;
  return Number(toDecimal(value).toString());
}

export function formatMoneyValue(value: DecimalLike): string {
  if (value == null) return '0.00';
  return roundDecimal(value, MONEY_SCALE).toFixed(MONEY_SCALE);
}

export function serializePrismaDecimals<T>(value: T): T {
  if (isPrismaDecimal(value)) {
    return decimalToNumber(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializePrismaDecimals(entry)) as T;
  }

  if (
    value &&
    typeof value === 'object' &&
    !(value instanceof Date) &&
    !(value instanceof Uint8Array)
  ) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, serializePrismaDecimals(entry)]),
    ) as T;
  }

  return value;
}

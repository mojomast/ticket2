import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const secretStr = process.env.AUTH_SECRET;
if (!secretStr || secretStr.length < 32) {
  throw new Error('AUTH_SECRET must be set and at least 32 characters');
}
const secret = new TextEncoder().encode(secretStr);

export interface TokenPayload extends JWTPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'TECHNICIAN' | 'CUSTOMER';
  firstName: string;
  lastName: string;
}

export async function createToken(user: Omit<TokenPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
  });
  return payload as TokenPayload;
}

export async function hashPassword(password: string): Promise<string> {
  const { argon2id } = await import('hash-wasm');
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: 'encoded',
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  const { argon2Verify } = await import('hash-wasm');
  return argon2Verify({ hash, password });
}

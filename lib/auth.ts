import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getUserById, UserRecord } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'secret-group-assignment-secure-jwt-key-2026-super-secret'
);

export const SESSION_COOKIE_NAME = 'sga_session';

export interface SessionPayload {
  userId: number;
  nim?: string;
  name: string;
  role: 'ADMIN' | 'PARTICIPANT';
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as number,
      nim: payload.nim as string | undefined,
      name: payload.name as string,
      role: payload.role as 'ADMIN' | 'PARTICIPANT',
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAuth(): Promise<UserRecord | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.role === 'ADMIN') {
    return {
      id: 0,
      nim: 'ADMIN',
      nama: session.name || 'Administrator',
      golongan: 'ADMIN',
      gender: 'L',
      role: 'ADMIN',
      status: 'APPROVED',
      group_number: null,
      is_leader: false,
      created_at: new Date().toISOString(),
    };
  }
  const user = getUserById(session.userId);
  return user;
}

export async function requireAdmin(): Promise<boolean> {
  const session = await getSession();
  return session !== null && session.role === 'ADMIN';
}

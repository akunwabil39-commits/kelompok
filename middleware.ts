import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'secret-group-assignment-secure-jwt-key-2026-super-secret'
);

const SESSION_COOKIE_NAME = 'sga_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let session: { userId: number; name: string; role: 'ADMIN' | 'PARTICIPANT' } | null = null;

  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(sessionCookie, JWT_SECRET);
      session = {
        userId: payload.userId as number,
        name: payload.name as string,
        role: payload.role as 'ADMIN' | 'PARTICIPANT',
      };
    } catch {
      session = null;
    }
  }

  // 1. If admin is already logged in and visits /hidden-admin-access, forward directly to /admin
  if (pathname === '/hidden-admin-access') {
    if (session && session.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // 2. Strict Admin Dashboard Protection: Redirect to /hidden-admin-access if not an authenticated ADMIN
  if (pathname.startsWith('/admin')) {
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/hidden-admin-access', request.url));
    }
  }

  // 3. Participant Dashboard Isolation: Redirect to homepage if not an authenticated PARTICIPANT
  if (pathname.startsWith('/dashboard')) {
    if (!session || session.role !== 'PARTICIPANT') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/hidden-admin-access'],
};

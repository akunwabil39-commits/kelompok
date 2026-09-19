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

  // 1. /hidden-admin-access (Admin Login Gate):
  // - If admin is already logged in, forward to /admin
  // - Allow opening the form to enter the master admin password
  if (pathname === '/hidden-admin-access') {
    if (session && session.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // 2. Strict Admin Dashboard Protection (/admin):
  // - If participant tries to enter, redirect directly to /dashboard
  // - If unauthenticated, redirect to /hidden-admin-access
  if (pathname.startsWith('/admin')) {
    if (session && session.role === 'PARTICIPANT') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/hidden-admin-access', request.url));
    }
    return NextResponse.next();
  }

  // 3. Participant Dashboard (/dashboard):
  // - If unauthenticated, redirect to login with notice
  // - If logged in as ADMIN or PARTICIPANT, allow through
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/?notice=login_required', request.url));
    }
    return NextResponse.next();
  }

  // 4. Root / (Login Page):
  // - If already logged in as ADMIN, redirect to /admin
  // - If already logged in as PARTICIPANT, redirect to /dashboard
  // (Note: /register is kept accessible so users or testers can register new accounts without getting trapped)
  if (pathname === '/') {
    if (session && session.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (session && session.role === 'PARTICIPANT') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/register', '/admin', '/admin/:path*', '/dashboard', '/dashboard/:path*', '/hidden-admin-access'],
};

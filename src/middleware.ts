import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Keep this synchronized with .env.local
const JWT_SECRET = process.env.JWT_SECRET || 'medicity_super_secure_jwt_secret_2026';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const isAuthPage = pathname === '/' || pathname === '/register';
  const isProtectedPath = pathname.startsWith('/admin') || pathname.startsWith('/analytics') || pathname.startsWith('/search');

  // Fast bypass for public assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  // Unauthenticated routing
  if (!token) {
    if (isProtectedPath) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Authenticated routing
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    // If user is logged in and visits the login/register page, auto-route them to their dashboard
    if (isAuthPage) {
      if (role === 'super_admin') return NextResponse.redirect(new URL('/analytics', request.url));
      if (role === 'hospital_admin') return NextResponse.redirect(new URL('/admin', request.url));
      return NextResponse.redirect(new URL('/search', request.url));
    }

    // RBAC Checks
    if (pathname.startsWith('/analytics') && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/search', request.url));
    }

    if (pathname.startsWith('/admin') && !['hospital_admin', 'super_admin'].includes(role)) {
      return NextResponse.redirect(new URL('/search', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Invalid or expired token
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('auth_token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

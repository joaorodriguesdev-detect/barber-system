import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/admin', '/superadmin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  if (!isProtected) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('access_token')?.value;
  const tenantStatus = request.cookies.get('tenant_status')?.value || 'active';

  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin') && tenantStatus !== 'active') {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  if (pathname.startsWith('/superadmin') && tenantStatus === 'suspended') {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  const response = NextResponse.next();
  response.headers.set('x-security-token', accessToken);
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/superadmin/:path*'],
};


import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Si intenta acceder a cualquier ruta de admin
  if (pathname.startsWith('/admin')) {
    // Excepto si es la página de login
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    const session = request.cookies.get('admin_session');
    
    // Si la sesión no es válida, redirigir al Login
    if (!session || session.value !== 'true') {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Coincide con /admin y cualquier subruta como /admin/pacientes, etc.
  matcher: ['/admin', '/admin/:path*'],
};

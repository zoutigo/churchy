import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session';

/**
 * Garde de navigation. Il ne valide PAS la session (les jetons sont vérifiés par l'API à chaque
 * appel) : il se contente de ne pas afficher les pages privées à quelqu'un qui n'a aucune session,
 * et de ne pas montrer connexion / inscription à quelqu'un qui en a une.
 */
const AUTH_ONLY_PAGES = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.get(SESSION_COOKIE)?.value === '1';

  if (pathname.startsWith('/dashboard') && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // `expired` : la session vient d'être déclarée perdue par le client. Sans cette exception, un cookie
  // indicateur périmé ferait rebondir /login vers /dashboard en boucle.
  if (
    AUTH_ONLY_PAGES.includes(pathname) &&
    hasSession &&
    !request.nextUrl.searchParams.has('expired')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/forgot-password'],
};

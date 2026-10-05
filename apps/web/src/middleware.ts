import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { LOCALE_COOKIE, DEFAULT_LOCALE, isLocale, routing, type Locale } from '@/i18n/routing';
import { splitLocale, toInternalPath, toLocalizedPath } from '@/i18n/paths';

/**
 * Garde de navigation + langue.
 *
 * Session : on ne la valide PAS ici (les jetons sont vérifiés par l'API à chaque appel) ; on évite
 * seulement d'afficher le privé à quelqu'un qui n'a aucune session, et connexion / inscription à
 * quelqu'un qui en a une.
 *
 * Langue : le site public et l'authentification sont préfixés (`/fr/…`, `/en/…`). Une adresse sans
 * préfixe (`/`, ancien lien partagé) est redirigée vers la langue du cookie, sinon le français :
 * on ne lit pas `Accept-Language`. Le tableau de bord (`/dashboard`) n'a pas de préfixe.
 */
const AUTH_ONLY_PAGES = ['/login', '/register', '/forgot-password', '/forgot-pin'];
const handleI18n = createIntlMiddleware(routing);

const preferredLocale = (request: NextRequest): Locale => {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  return isLocale(cookie) ? cookie : DEFAULT_LOCALE;
};

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.get(SESSION_COOKIE)?.value === '1';

  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    if (hasSession) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = toLocalizedPath(preferredLocale(request), '/login');
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const { locale, rest } = splitLocale(pathname);

  if (!locale) {
    // Ancienne adresse ou racine : même chemin, dans la langue préférée.
    const url = request.nextUrl.clone();
    url.pathname = toLocalizedPath(preferredLocale(request), pathname);
    return NextResponse.redirect(url, pathname === '/' ? 307 : 308);
  }

  // `expired` : la session vient d'être déclarée perdue par le client. Sans cette exception, un cookie
  // indicateur périmé ferait rebondir la connexion vers /dashboard en boucle.
  const internal = toInternalPath(locale, rest);
  if (
    hasSession &&
    internal &&
    AUTH_ONLY_PAGES.includes(internal) &&
    !request.nextUrl.searchParams.has('expired')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return handleI18n(request);
}

export const config = {
  // Tout sauf l'API, les ressources de Next et les fichiers (icônes, images Open Graph générées…).
  matcher: ['/((?!api|_next|_vercel|opengraph-image|twitter-image|.*\\..*).*)'],
};

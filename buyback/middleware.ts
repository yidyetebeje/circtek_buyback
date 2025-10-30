import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { auth } from './auth';

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await auth(); // Get session early

  try {
    // Skip middleware completely for API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    // Define the locale type based on routing configuration
    type Locale = typeof routing.locales[number];

    // Helper to get locale from pathname or default to 'en' if not present
    const getLocaleFromPath = (path: string): Locale => {
      const pathParts = path.split('/');
      if (pathParts.length > 1) {
        const potentialLocale = pathParts[1] as Locale;
        if (routing.locales.includes(potentialLocale)) {
          return potentialLocale;
        }
      }
      return routing.defaultLocale as Locale;
    };

    const currentLocale: Locale = getLocaleFromPath(pathname);

    // Check for /admin root path (e.g., /en/admin or /nl/admin/)
    const adminRootPathRegex = new RegExp(`^/(${routing.locales.join('|')})/admin/?$`);
    const isAdminRootPath = adminRootPathRegex.test(pathname);

    if (isAdminRootPath) {
      if (!session) {
        console.log(`Redirecting unauthenticated user from ${pathname} to ${currentLocale}/admin/login page`);
        const loginUrl = new URL(`/${currentLocale}/admin/login`, request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      // Authenticated user, redirect to dashboards
      console.log(`Redirecting authenticated user from ${pathname} to ${currentLocale}/admin/dashboards`);
      const dashboardUrl = new URL(`/${currentLocale}/admin/dashboards`, request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // Check for other admin routes, excluding /admin/login
    if (pathname.includes('/admin') && !pathname.includes('/admin/login')) {
      if (!session) {
        console.log(`Redirecting unauthenticated user from ${pathname} to ${currentLocale}/admin/login page`);
        const loginUrl = new URL(`/${currentLocale}/admin/login`, request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      // Authenticated user, proceed with intl middleware for other admin pages
      console.log(`Authenticated user accessing ${pathname}, applying intl middleware`);
      return intlMiddleware(request);
    }

    // For non-admin, non-api routes, or /admin/login, use the intl middleware
    return intlMiddleware(request);
  } catch (error) {
    console.error('Middleware error:', error);
    // If there's an error in the middleware, allow the request to continue
    // so the error can be handled by the appropriate error boundary
    return NextResponse.next();
  }
}

export const config = {
  // Match all pathnames except for:
  // - API routes
  // - Next.js internals
  // - Static files
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (.png, .jpg, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'
  ]
};
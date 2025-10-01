import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

/**
 * Simple auth guard that checks if an auth token exists.
 * If not authenticated, redirects to /login.
 */
export const authGuard: CanMatchFn = (): boolean | UrlTree => {
  const router = inject(Router);
  const token = localStorage.getItem('auth_token');

  return token ? true : router.parseUrl('/login');
};

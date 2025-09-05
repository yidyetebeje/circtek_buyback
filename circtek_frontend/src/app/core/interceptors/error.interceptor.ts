import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Clear token to avoid stale state and redirect to login
        try { localStorage.removeItem('auth_token'); } catch {}
        router.navigate(['/login']);
      }
      // Re-throw the original error for subscribers who need it
      return throwError(() => error);
    })
  );
};

import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

// Only allow super_admin (role_id === 1)
export const superAdminGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for auth initialization before checking permissions
  return auth.initialized$.pipe(
    map(() => {
      const isSuper = auth.currentUser()?.role_id === 1;
      return isSuper ? true : router.parseUrl('/management');
    })
  );
};

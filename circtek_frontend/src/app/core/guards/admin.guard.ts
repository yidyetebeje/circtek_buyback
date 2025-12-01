import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ROLE_ID } from '../constants/role.constants';

/**
 * Guard that allows access only for admin and super_admin roles
 * Redirects unauthorized users to /dashboard
 */
export const adminGuard: CanMatchFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const roleId = auth.currentUser()?.role_id;

    const isAdmin = roleId === ROLE_ID.ADMIN || roleId === ROLE_ID.SUPER_ADMIN;
    return isAdmin ? true : router.parseUrl('/dashboard');
};

import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ROLE_ID } from '../constants/role.constants';

/**
 * Guard that allows access for stock managers and admin roles
 * Redirects unauthorized users to /dashboard
 */
export const stockGuard: CanMatchFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const roleId = auth.currentUser()?.role_id;

    const canAccess =
        roleId === ROLE_ID.STOCK_MANAGER ||
        roleId === ROLE_ID.REPAIR_MANAGER ||
        roleId === ROLE_ID.ADMIN ||
        roleId === ROLE_ID.SUPER_ADMIN;

    return canAccess ? true : router.parseUrl('/dashboard');
};

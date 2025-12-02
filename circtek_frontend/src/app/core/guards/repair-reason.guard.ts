import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ROLE_ID } from '../constants/role.constants';

/**
 * Guard that allows access only for admin, super_admin, and repair_manager roles
 * Redirects unauthorized users to /dashboard
 */
export const repairReasonGuard: CanMatchFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const roleId = auth.currentUser()?.role_id;

    const hasAccess = roleId === ROLE_ID.ADMIN ||
        roleId === ROLE_ID.SUPER_ADMIN ||
        roleId === ROLE_ID.REPAIR_MANAGER;
    return hasAccess ? true : router.parseUrl('/dashboard');
};

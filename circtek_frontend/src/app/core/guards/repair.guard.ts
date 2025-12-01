import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ROLE_ID } from '../constants/role.constants';

/**
 * Guard that allows access for repair staff (repair_manager, repair_technician)
 * and admin roles. Redirects unauthorized users to /dashboard
 */
export const repairGuard: CanMatchFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const roleId = auth.currentUser()?.role_id;

    const canAccess =
        roleId === ROLE_ID.REPAIR_MANAGER ||
        roleId === ROLE_ID.REPAIR_TECHNICIAN ||
        roleId === ROLE_ID.ADMIN ||
        roleId === ROLE_ID.SUPER_ADMIN;

    return canAccess ? true : router.parseUrl('/dashboard');
};

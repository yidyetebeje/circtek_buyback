import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoleService } from '../services/role.service';
import { ROLE_NAME } from '../constants/role.constants';

/**
 * Guard that allows access only for admin and super_admin roles
 * Redirects unauthorized users to /dashboard
 */
export const adminGuard: CanMatchFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const roleService = inject(RoleService);
    const roleId = auth.currentUser()?.role_id;

    const isAdmin = roleService.hasAnyRole(roleId, [ROLE_NAME.ADMIN, ROLE_NAME.SUPER_ADMIN]);
    return isAdmin ? true : router.parseUrl('/dashboard');
};

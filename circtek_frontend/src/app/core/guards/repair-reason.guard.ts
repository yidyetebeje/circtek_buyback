import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoleService } from '../services/role.service';
import { ROLE_NAME } from '../constants/role.constants';
import { map } from 'rxjs';

/**
 * Guard that allows access only for admin, super_admin, and repair_manager roles
 * Redirects unauthorized users to /dashboard
 */
export const repairReasonGuard: CanMatchFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const roleService = inject(RoleService);

    // Wait for auth initialization before checking permissions
    return auth.initialized$.pipe(
        map(() => {
            const roleId = auth.currentUser()?.role_id;
            const hasAccess = roleService.hasAnyRole(roleId, [
                ROLE_NAME.ADMIN,
                ROLE_NAME.SUPER_ADMIN,
                ROLE_NAME.REPAIR_MANAGER
            ]);
            return hasAccess ? true : router.parseUrl('/dashboard');
        })
    );
};

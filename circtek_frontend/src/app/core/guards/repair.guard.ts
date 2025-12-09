import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoleService } from '../services/role.service';
import { ROLE_NAME } from '../constants/role.constants';
import { map } from 'rxjs';

/**
 * Guard that allows access for repair staff (repair_manager, repair_technician)
 * and admin roles. Redirects unauthorized users to /dashboard
 */
export const repairGuard: CanMatchFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const roleService = inject(RoleService);

    // Wait for auth initialization before checking permissions
    return auth.initialized$.pipe(
        map(() => {
            const roleId = auth.currentUser()?.role_id;
            const canAccess = roleService.hasAnyRole(roleId, [
                ROLE_NAME.REPAIR_MANAGER,
                ROLE_NAME.REPAIR_TECHNICIAN,
                ROLE_NAME.ADMIN,
                ROLE_NAME.SUPER_ADMIN
            ]);
            return canAccess ? true : router.parseUrl('/dashboard');
        })
    );
};

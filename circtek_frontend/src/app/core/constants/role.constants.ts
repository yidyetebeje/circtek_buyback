/**
 * Role name constants for type-safe role checking.
 * These are used with RoleService.getRoleId() or RoleService.hasRole()
 */
export const ROLE_NAME = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    TESTER: 'tester',
    REPAIR_MANAGER: 'repair_manager',
    REPAIR_TECHNICIAN: 'repair_technician',
    STOCK_MANAGER: 'stock_manager',
} as const;

/**
 * Type for role name values
 */
export type RoleName = typeof ROLE_NAME[keyof typeof ROLE_NAME];

/**
 * Role ID constants for type-safe role checking (fallback values)
 * These correspond to the roles defined in the backend seed data
 * @deprecated Use RoleService.getRoleId() with ROLE_NAME instead
 */
export const ROLE_ID = {
    SUPER_ADMIN: 1,
    ADMIN: 2,
    TESTER: 3,
    REPAIR_MANAGER: 4,
    REPAIR_TECHNICIAN: 5,
    STOCK_MANAGER: 6,
} as const;

/**
 * Type for role ID values
 */
export type RoleId = typeof ROLE_ID[keyof typeof ROLE_ID];


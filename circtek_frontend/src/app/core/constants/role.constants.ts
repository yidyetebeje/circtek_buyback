/**
 * Role ID constants for type-safe role checking
 * These correspond to the roles defined in the backend seed data
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

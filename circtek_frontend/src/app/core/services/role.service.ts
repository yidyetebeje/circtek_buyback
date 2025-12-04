import { Injectable, signal, inject, computed } from '@angular/core';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { ApiService } from './api.service';
import { Role } from '../models/role';

const CACHE_KEY = 'circtek_roles_cache';

/**
 * Service for managing role data with caching.
 * Loads roles from the backend once per session and caches them
 * in memory and localStorage for instant access.
 */
@Injectable({
    providedIn: 'root'
})
export class RoleService {
    private readonly api = inject(ApiService);

    // In-memory cache of roles keyed by name
    private readonly rolesMap = signal<Record<string, number>>({});
    private readonly rolesLoaded = signal(false);

    constructor() {
        this.loadFromLocalStorage();
    }

    /**
     * Whether roles have been loaded (from cache or API)
     */
    readonly isLoaded = computed(() => this.rolesLoaded());

    /**
     * Load roles from the backend API.
     * If already loaded, returns immediately without making an API call.
     */
    loadRoles(): Observable<void> {
        if (this.rolesLoaded()) {
            return of(void 0);
        }

        return this.api.getRoles().pipe(
            map(response => {
                const roles = response.data ?? [];
                this.cacheRoles(roles);
            }),
            catchError(error => {
                console.error('Failed to load roles from API:', error);
                // Return void to not break the chain, roles will use fallback
                return of(void 0);
            })
        );
    }

    /**
     * Get the role ID for a given role name.
     * @param name Role name (e.g., 'admin', 'super_admin')
     * @returns The role ID or undefined if not found
     */
    getRoleId(name: string): number | undefined {
        return this.rolesMap()[name];
    }

    /**
     * Check if a role ID matches a given role name.
     * @param roleId The user's role ID
     * @param roleName The role name to check against
     * @returns true if the role ID matches the role name
     */
    hasRole(roleId: number | undefined | null, roleName: string): boolean {
        if (roleId == null) return false;
        const expectedId = this.getRoleId(roleName);
        return expectedId !== undefined && roleId === expectedId;
    }

    /**
     * Check if a role ID matches any of the given role names.
     * @param roleId The user's role ID
     * @param roleNames Array of role names to check against
     * @returns true if the role ID matches any of the role names
     */
    hasAnyRole(roleId: number | undefined | null, roleNames: string[]): boolean {
        return roleNames.some(name => this.hasRole(roleId, name));
    }

    /**
     * Clear the cached roles (call on logout)
     */
    clearCache(): void {
        this.rolesMap.set({});
        this.rolesLoaded.set(false);
        try {
            localStorage.removeItem(CACHE_KEY);
        } catch {
            // Ignore localStorage errors
        }
    }

    /**
     * Cache roles in memory and localStorage
     */
    private cacheRoles(roles: Role[]): void {
        const map: Record<string, number> = {};
        for (const role of roles) {
            map[role.name] = role.id;
        }
        this.rolesMap.set(map);
        this.rolesLoaded.set(true);
        this.saveToLocalStorage(map);
    }

    /**
     * Load roles from localStorage cache
     */
    private loadFromLocalStorage(): void {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const map = JSON.parse(cached) as Record<string, number>;
                if (map && typeof map === 'object') {
                    this.rolesMap.set(map);
                    this.rolesLoaded.set(true);
                }
            }
        } catch {
            // Ignore parse errors, will load from API
        }
    }

    /**
     * Save roles to localStorage
     */
    private saveToLocalStorage(map: Record<string, number>): void {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(map));
        } catch {
            // Ignore localStorage errors (e.g., quota exceeded)
        }
    }
}

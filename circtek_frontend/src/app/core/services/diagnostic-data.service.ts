import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, BehaviorSubject, shareReplay, tap, map, firstValueFrom, timer, switchMap, take, takeWhile, retry, timeout, catchError, of } from 'rxjs';
import { Diagnostic } from '../models/diagnostic';
import { User } from '../models/user';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { HttpParams } from '@angular/common/http';

export interface CachedData<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export interface UserInfo {
  id: number;
  user_name: string;
  tenant_id?: number;
  tenant_name?: string;
  role_id: number;
}

export interface TenantInfo {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class DiagnosticDataService {
  private readonly apiService = inject(ApiService);
  private readonly auth = inject(AuthService);

  // Cache durations
  private readonly USER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly TENANT_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly OPTIONS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  
  // Cached data storage
  private userInfoCache = signal<CachedData<UserInfo> | null>(null);
  private tenantInfoCache = signal<CachedData<TenantInfo> | null>(null);
  private warehouseOptionsCache = signal<CachedData<Array<{ label: string; value: string }>> | null>(null);
  private testerOptionsCache = signal<CachedData<Array<{ label: string; value: string }>> | null>(null);
  private tenantOptionsCache = signal<CachedData<Array<{ label: string; value: string }>> | null>(null);
  
  // Current diagnostic data
  private currentDiagnosticsData = signal<Diagnostic[]>([]);
  private diagnosticsMetaData = signal<{ total: number; page: number; limit: number }>({ total: 0, page: 1, limit: 10 });
  
  // Loading states
  private loadingStates = {
    userInfo: signal<boolean>(false),
    tenantInfo: signal<boolean>(false),
    warehouseOptions: signal<boolean>(false),
    testerOptions: signal<boolean>(false),
    tenantOptions: signal<boolean>(false),
  };

  // Computed properties for easy access
  readonly userInfo = computed(() => {
    const cached = this.userInfoCache();
    return this.isValidCache(cached) ? cached.data : null;
  });

  readonly tenantInfo = computed(() => {
    const cached = this.tenantInfoCache();
    return this.isValidCache(cached) ? cached.data : null;
  });

  readonly warehouseOptions = computed(() => {
    const cached = this.warehouseOptionsCache();
    const isValid = this.isValidCache(cached);
    const data = isValid ? cached.data : [];
    console.log('warehouseOptions computed - cached:', cached, 'isValid:', isValid, 'data:', data);
    return data;
  });

  readonly testerOptions = computed(() => {
    const cached = this.testerOptionsCache();
    const isValid = this.isValidCache(cached);
    const data = isValid ? cached.data : [];
    console.log('testerOptions computed - cached:', cached, 'isValid:', isValid, 'data:', data);
    return data;
  });

  readonly tenantOptions = computed(() => {
    const cached = this.tenantOptionsCache();
    const isValid = this.isValidCache(cached);
    const data = isValid ? cached.data : [];
    console.log('tenantOptions computed - cached:', cached, 'isValid:', isValid, 'data:', data);
    return data;
  });

  readonly diagnosticsData = computed(() => this.currentDiagnosticsData());
  readonly diagnosticsMetadata = computed(() => this.diagnosticsMetaData());
  
  readonly isSuperAdmin = computed(() => this.userInfo()?.role_id === 1);

  // Loading state getters
  readonly isLoadingUserInfo = computed(() => this.loadingStates.userInfo());
  readonly isLoadingTenantInfo = computed(() => this.loadingStates.tenantInfo());
  readonly isLoadingWarehouseOptions = computed(() => this.loadingStates.warehouseOptions());
  readonly isLoadingTesterOptions = computed(() => this.loadingStates.testerOptions());
  readonly isLoadingTenantOptions = computed(() => this.loadingStates.tenantOptions());

  constructor() {
    // Initialize user info on service creation
    this.initializeUserInfo();
  }

  private isValidCache<T>(cache: CachedData<T> | null): cache is CachedData<T> {
    return cache !== null && Date.now() < cache.expiry;
  }

  private createCachedData<T>(data: T, duration: number): CachedData<T> {
    const now = Date.now();
    return {
      data,
      timestamp: now,
      expiry: now + duration
    };
  }

  // Initialize user and tenant info
  private initializeUserInfo() {
    const currentUser = this.auth.currentUser();
    if (currentUser && !this.isValidCache(this.userInfoCache())) {
      this.loadUserInfo();
    }
  }

  // Load and cache user info
  loadUserInfo(): Observable<UserInfo> {
    console.log('loadUserInfo called - checking cache...');
    
    if (this.isValidCache(this.userInfoCache())) {
      console.log('Using cached user info:', this.userInfoCache()!.data);
      return new BehaviorSubject(this.userInfoCache()!.data).asObservable();
    }

    this.loadingStates.userInfo.set(true);

    const currentUser = this.auth.currentUser();
    console.log('Current user from auth service:', currentUser);
    
    if (!currentUser) {
      console.error('No authenticated user found in auth service');
      this.loadingStates.userInfo.set(false);
      throw new Error('No authenticated user found');
    }

    // Get full user details
    console.log('Fetching full user details for user ID:', currentUser.id);
    
    return this.apiService.getUser(currentUser.id).pipe(
      tap((user) => {
        console.log('Full user details received:', user);
        
        const userInfo: UserInfo = {
          id: user.id,
          user_name: user.user_name,
          tenant_id: user.tenant_id || undefined,
          tenant_name: user.tenant_name || undefined,
          role_id: user.role_id
        };
        
        console.log('Caching user info:', userInfo);
        this.userInfoCache.set(this.createCachedData(userInfo, this.USER_CACHE_DURATION));
        
        // Load tenant info if user has tenant_id and is not super admin
        if (user.tenant_id && user.role_id !== 1) {
          console.log('Loading tenant info for tenant ID:', user.tenant_id);
          this.loadTenantInfo(user.tenant_id);
        }
        
        this.loadingStates.userInfo.set(false);
      }),
      map((user) => ({
        id: user.id,
        user_name: user.user_name,
        tenant_id: user.tenant_id || undefined,
        tenant_name: user.tenant_name || undefined,
        role_id: user.role_id
      })),
      shareReplay(1)
    );
  }

  // Load and cache tenant info
  loadTenantInfo(tenantId: number): Observable<TenantInfo> {
    const cached = this.tenantInfoCache();
    if (this.isValidCache(cached) && cached.data.id === tenantId) {
      return new BehaviorSubject(cached.data).asObservable();
    }

    this.loadingStates.tenantInfo.set(true);

    return this.apiService.getTenant(tenantId).pipe(
      tap((response) => {
        const tenantInfo: TenantInfo = {
          id: response.data.id,
          name: response.data.name
        };
        this.tenantInfoCache.set(this.createCachedData(tenantInfo, this.TENANT_CACHE_DURATION));
        this.loadingStates.tenantInfo.set(false);
      }),
      map((response) => ({
        id: response.data.id,
        name: response.data.name
      })),
      shareReplay(1)
    );
  }

  // Load and cache warehouse options
  loadWarehouseOptions(tenantId?: number): Observable<Array<{ label: string; value: string }>> {
    console.log('loadWarehouseOptions called with tenantId:', tenantId);
    
    const cached = this.warehouseOptionsCache();
    if (this.isValidCache(cached)) {
      console.log('Using cached warehouse options:', cached.data);
      return new BehaviorSubject(cached.data).asObservable();
    }

    this.loadingStates.warehouseOptions.set(true);

    let params = new HttpParams().set('limit', '1000');
    if (tenantId) {
      params = params.set('tenant_id', String(tenantId));
    }
    
    console.log('Loading warehouse options with params:', params.toString());

      return this.apiService.getWarehouses(params).pipe(
      tap((res) => {
        console.log('Warehouse API response:', res);
        const options = (res.data ?? []).map(w => ({ label: w.name, value: String(w.id) }));
        console.log('Processed warehouse options:', options);
        this.warehouseOptionsCache.set(this.createCachedData(options, this.OPTIONS_CACHE_DURATION));
        this.loadingStates.warehouseOptions.set(false);
      }),
      map((res) => (res.data ?? []).map(w => ({ label: w.name, value: String(w.id) }))),
      tap((options) => console.log('Final warehouse options:', options)),
      catchError((error) => {
        console.error('Error loading warehouse options:', error);
        this.loadingStates.warehouseOptions.set(false);
        // Return empty array on error
        this.warehouseOptionsCache.set(this.createCachedData([], this.OPTIONS_CACHE_DURATION));
        return of([]);
      }),
      shareReplay(1)
    );
  }

  // Load and cache tester options
  loadTesterOptions(tenantId?: number): Observable<Array<{ label: string; value: string }>> {
    console.log('loadTesterOptions called with tenantId:', tenantId);
    
    const cached = this.testerOptionsCache();
    if (this.isValidCache(cached)) {
      console.log('Using cached tester options:', cached.data);
      return new BehaviorSubject(cached.data).asObservable();
    }

    this.loadingStates.testerOptions.set(true);

    let params = new HttpParams().set('limit', '1000').set('role_id', '3');
    if (tenantId) {
      params = params.set('tenant_id', String(tenantId));
    }
    
    console.log('Loading tester options with params:', params.toString());

      return this.apiService.getUsers(params).pipe(
      tap((res) => {
        console.log('Tester API response:', res);
        const options = (res.data ?? []).map(u => ({ label: u.user_name, value: String(u.id) }));
        console.log('Processed tester options:', options);
        this.testerOptionsCache.set(this.createCachedData(options, this.OPTIONS_CACHE_DURATION));
        this.loadingStates.testerOptions.set(false);
      }),
      map((res) => (res.data ?? []).map(u => ({ label: u.user_name, value: String(u.id) }))),
      tap((options) => console.log('Final tester options:', options)),
      catchError((error) => {
        console.error('Error loading tester options:', error);
        this.loadingStates.testerOptions.set(false);
        // Return empty array on error
        this.testerOptionsCache.set(this.createCachedData([], this.OPTIONS_CACHE_DURATION));
        return of([]);
      }),
      shareReplay(1)
    );
  }

  // Load and cache tenant options (for super admin)
  loadTenantOptions(): Observable<Array<{ label: string; value: string }>> {
    const cached = this.tenantOptionsCache();
    if (this.isValidCache(cached)) {
      return new BehaviorSubject(cached.data).asObservable();
    }

    this.loadingStates.tenantOptions.set(true);

    const params = new HttpParams().set('limit', '1000');
    console.log('Loading tenant options with params:', params.toString());
    
    return this.apiService.getTenants(params).pipe(
      tap((res) => {
        console.log('Tenant API response:', res);
        const options = (res.data ?? []).map(t => ({ label: t.name, value: String(t.id) }));
        console.log('Processed tenant options:', options);
        this.tenantOptionsCache.set(this.createCachedData(options, this.OPTIONS_CACHE_DURATION));
        this.loadingStates.tenantOptions.set(false);
      }),
      map((res) => (res.data ?? []).map(t => ({ label: t.name, value: String(t.id) }))),
      tap((options) => console.log('Final tenant options:', options)),
      catchError((error) => {
        console.error('Error loading tenant options:', error);
        this.loadingStates.tenantOptions.set(false);
        // Return empty array on error
        this.tenantOptionsCache.set(this.createCachedData([], this.OPTIONS_CACHE_DURATION));
        return of([]);
      }),
      shareReplay(1)
    );
  }

  // Set current diagnostics data
  setDiagnosticsData(data: Diagnostic[], metadata: { total: number; page: number; limit: number }) {
    this.currentDiagnosticsData.set(data);
    this.diagnosticsMetaData.set(metadata);
  }

  // Get diagnostic by ID from current data
  getDiagnosticById(id: number): Diagnostic | null {
    return this.currentDiagnosticsData().find(d => d.id === id) || null;
  }

  // Clear specific cache
  clearCache(type: 'userInfo' | 'tenantInfo' | 'warehouseOptions' | 'testerOptions' | 'tenantOptions' | 'all') {
    console.log('Clearing cache for:', type);
    switch (type) {
      case 'userInfo':
        this.userInfoCache.set(null);
        break;
      case 'tenantInfo':
        this.tenantInfoCache.set(null);
        break;
      case 'warehouseOptions':
        this.warehouseOptionsCache.set(null);
        break;
      case 'testerOptions':
        this.testerOptionsCache.set(null);
        break;
      case 'tenantOptions':
        this.tenantOptionsCache.set(null);
        break;
      case 'all':
        this.userInfoCache.set(null);
        this.tenantInfoCache.set(null);
        this.warehouseOptionsCache.set(null);
        this.testerOptionsCache.set(null);
        this.tenantOptionsCache.set(null);
        break;
    }
  }

  // Force refresh options (clears cache and reloads)
  forceRefreshOptions(tenantId?: number): Promise<void> {
    console.log('Force refreshing options for tenantId:', tenantId);
    
    // Clear caches
    this.clearCache('warehouseOptions');
    this.clearCache('testerOptions');
    this.clearCache('tenantOptions');
    
    // Reload based on user role
    const userInfo = this.userInfo();
    if (!userInfo) {
      console.error('No user info available for force refresh');
      return Promise.reject('No user info available');
    }
    
    const loadPromises: Promise<any>[] = [];
    
    if (userInfo.role_id === 1) {
      // Super admin - load all options
      loadPromises.push(firstValueFrom(this.loadTenantOptions()));
      loadPromises.push(firstValueFrom(this.loadWarehouseOptions()));
      loadPromises.push(firstValueFrom(this.loadTesterOptions()));
    } else {
      // Regular user - load tenant-specific options
      const targetTenantId = tenantId || userInfo.tenant_id;
      if (targetTenantId) {
        loadPromises.push(firstValueFrom(this.loadWarehouseOptions(targetTenantId)));
        loadPromises.push(firstValueFrom(this.loadTesterOptions(targetTenantId)));
      }
    }
    
    return Promise.all(loadPromises).then(() => {
      console.log('Force refresh completed successfully');
    }).catch(error => {
      console.error('Force refresh failed:', error);
      throw error;
    });
  }

  // Clear expired caches
  clearExpiredCaches() {
    const now = Date.now();
    
    if (this.userInfoCache() && now >= this.userInfoCache()!.expiry) {
      this.userInfoCache.set(null);
    }
    if (this.tenantInfoCache() && now >= this.tenantInfoCache()!.expiry) {
      this.tenantInfoCache.set(null);
    }
    if (this.warehouseOptionsCache() && now >= this.warehouseOptionsCache()!.expiry) {
      this.warehouseOptionsCache.set(null);
    }
    if (this.testerOptionsCache() && now >= this.testerOptionsCache()!.expiry) {
      this.testerOptionsCache.set(null);
    }
    if (this.tenantOptionsCache() && now >= this.tenantOptionsCache()!.expiry) {
      this.tenantOptionsCache.set(null);
    }
  }

  // Wait for auth service to have current user (with timeout)
  private waitForCurrentUser(): Observable<any> {
    return timer(0, 100).pipe(
      switchMap(() => {
        const currentUser = this.auth.currentUser();
        console.log('Waiting for current user - attempt:', currentUser);
        
        if (currentUser) {
          return [currentUser]; // Return the user in an array to emit it
        }
        throw new Error('User not available yet');
      }),
      retry({ count: 30, delay: 100 }), // Retry 30 times with 100ms delay (3 seconds total)
      timeout(5000), // 5 second total timeout
      take(1) // Take the first successful result
    );
  }

  // Initialize all required data for the diagnostics page
  async initializePageData(): Promise<void> {
    try {
      console.log('Initializing page data...');
      
      // Wait for auth service to have current user first
      try {
        await firstValueFrom(this.waitForCurrentUser());
        console.log('Current user is now available');
      } catch (error) {
        console.error('Timeout waiting for current user:', error);
        // Continue anyway, loadUserInfo will handle the error
      }
      
      // Load user info first
      if (!this.isValidCache(this.userInfoCache())) {
        console.log('Loading user info...');
        await firstValueFrom(this.loadUserInfo());
      }

      const userInfo = this.userInfo();
      console.log('User info after loading:', userInfo);
      
      if (!userInfo) {
        throw new Error('Failed to load user information');
      }

      // Load options based on user role
      const loadPromises: Promise<any>[] = [];

      if (userInfo.role_id === 1) {
        console.log('Loading options for super admin...');
        // Super admin - load all options
        loadPromises.push(
          firstValueFrom(this.loadTenantOptions()).catch(err => {
            console.error('Failed to load tenant options:', err);
            return [];
          })
        );
        loadPromises.push(
          firstValueFrom(this.loadWarehouseOptions()).catch(err => {
            console.error('Failed to load warehouse options:', err);
            return [];
          })
        );
        loadPromises.push(
          firstValueFrom(this.loadTesterOptions()).catch(err => {
            console.error('Failed to load tester options:', err);
            return [];
          })
        );
      } else {
        console.log('Loading options for regular user with tenant:', userInfo.tenant_id);
        // Regular user - load tenant-specific options
        const tenantId = userInfo.tenant_id;
        if (tenantId) {
          loadPromises.push(
            firstValueFrom(this.loadWarehouseOptions(tenantId)).catch(err => {
              console.error('Failed to load warehouse options for tenant', tenantId, ':', err);
              return [];
            })
          );
          loadPromises.push(
            firstValueFrom(this.loadTesterOptions(tenantId)).catch(err => {
              console.error('Failed to load tester options for tenant', tenantId, ':', err);
              return [];
            })
          );
        }
      }

      console.log('Waiting for', loadPromises.length, 'option loading promises...');
      const results = await Promise.allSettled(loadPromises);
      
      // Log results for debugging
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`Promise ${index} fulfilled with:`, result.value);
        } else {
          console.error(`Promise ${index} rejected:`, result.reason);
        }
      });
      
      console.log('All option loading attempts completed');
    } catch (error) {
      console.error('Error initializing page data:', error);
      throw error;
    }
  }
}
import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, BehaviorSubject, shareReplay, tap, map } from 'rxjs';
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
    return this.isValidCache(cached) ? cached.data : [];
  });

  readonly testerOptions = computed(() => {
    const cached = this.testerOptionsCache();
    return this.isValidCache(cached) ? cached.data : [];
  });

  readonly tenantOptions = computed(() => {
    const cached = this.tenantOptionsCache();
    return this.isValidCache(cached) ? cached.data : [];
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
    if (this.isValidCache(this.userInfoCache())) {
      return new BehaviorSubject(this.userInfoCache()!.data).asObservable();
    }

    this.loadingStates.userInfo.set(true);

    const currentUser = this.auth.currentUser();
    if (!currentUser) {
      this.loadingStates.userInfo.set(false);
      throw new Error('No authenticated user found');
    }

    // Get full user details
    return this.apiService.getUser(currentUser.id).pipe(
      tap((user) => {
        const userInfo: UserInfo = {
          id: user.id,
          user_name: user.user_name,
          tenant_id: user.tenant_id || undefined,
          tenant_name: user.tenant_name || undefined,
          role_id: user.role_id
        };
        this.userInfoCache.set(this.createCachedData(userInfo, this.USER_CACHE_DURATION));
        
        // Load tenant info if user has tenant_id and is not super admin
        if (user.tenant_id && user.role_id !== 1) {
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
    const cached = this.warehouseOptionsCache();
    if (this.isValidCache(cached)) {
      return new BehaviorSubject(cached.data).asObservable();
    }

    this.loadingStates.warehouseOptions.set(true);

    let params = new HttpParams().set('limit', '1000');
    if (tenantId) {
      params = params.set('tenant_id', String(tenantId));
    }

    return this.apiService.getWarehouses(params).pipe(
      tap((res) => {
        const options = (res.data ?? []).map(w => ({ label: w.name, value: String(w.id) }));
        this.warehouseOptionsCache.set(this.createCachedData(options, this.OPTIONS_CACHE_DURATION));
        this.loadingStates.warehouseOptions.set(false);
      }),
      map((res) => (res.data ?? []).map(w => ({ label: w.name, value: String(w.id) }))),
      shareReplay(1)
    );
  }

  // Load and cache tester options
  loadTesterOptions(tenantId?: number): Observable<Array<{ label: string; value: string }>> {
    const cached = this.testerOptionsCache();
    if (this.isValidCache(cached)) {
      return new BehaviorSubject(cached.data).asObservable();
    }

    this.loadingStates.testerOptions.set(true);

    let params = new HttpParams().set('limit', '1000').set('role_id', '3');
    if (tenantId) {
      params = params.set('tenant_id', String(tenantId));
    }

    return this.apiService.getUsers(params).pipe(
      tap((res) => {
        const options = (res.data ?? []).map(u => ({ label: u.user_name, value: String(u.id) }));
        this.testerOptionsCache.set(this.createCachedData(options, this.OPTIONS_CACHE_DURATION));
        this.loadingStates.testerOptions.set(false);
      }),
      map((res) => (res.data ?? []).map(u => ({ label: u.user_name, value: String(u.id) }))),
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
    return this.apiService.getTenants(params).pipe(
      tap((res) => {
        const options = (res.data ?? []).map(t => ({ label: t.name, value: String(t.id) }));
        this.tenantOptionsCache.set(this.createCachedData(options, this.OPTIONS_CACHE_DURATION));
        this.loadingStates.tenantOptions.set(false);
      }),
      map((res) => (res.data ?? []).map(t => ({ label: t.name, value: String(t.id) }))),
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

  // Initialize all required data for the diagnostics page
  initializePageData(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Load user info first
        if (!this.isValidCache(this.userInfoCache())) {
          await this.loadUserInfo().toPromise();
        }

        const userInfo = this.userInfo();
        if (!userInfo) {
          reject(new Error('Failed to load user information'));
          return;
        }

        // Load options based on user role
        const loadPromises: Promise<any>[] = [];

        if (userInfo.role_id === 1) {
          // Super admin - load all options
          loadPromises.push(this.loadTenantOptions().toPromise());
          loadPromises.push(this.loadWarehouseOptions().toPromise());
          loadPromises.push(this.loadTesterOptions().toPromise());
        } else {
          // Regular user - load tenant-specific options
          const tenantId = userInfo.tenant_id;
          if (tenantId) {
            loadPromises.push(this.loadWarehouseOptions(tenantId).toPromise());
            loadPromises.push(this.loadTesterOptions(tenantId).toPromise());
          }
        }

        await Promise.all(loadPromises);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}
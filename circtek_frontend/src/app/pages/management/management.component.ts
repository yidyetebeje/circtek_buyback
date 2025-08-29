import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericPageComponent, type Facet, type GenericTab } from '../../shared/components/generic-page/generic-page.component';
import { ColumnDef } from '@tanstack/angular-table';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../core/models/user';
import { Warehouse } from '../../core/models/warehouse';
import { WiFiProfile } from '../../core/models/wifi-profile';

// Union to drive the generic table
export type MgmtRow = User | Warehouse | WiFiProfile;

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [CommonModule, GenericPageComponent],
  templateUrl: './management.component.html',
  styleUrls: ['./management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagementComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Loading & data
  loading = signal(false);
  data = signal<MgmtRow[]>([]);
  total = signal(0);

  // Tab & pagination
  activeTab = signal<'users' | 'warehouses' | 'wifi'>('users');
  pageIndex = signal(0);
  pageSize = signal(10);

  // Filters
  search = signal('');
  selectedRoleId = signal<number | null>(null); // users
  selectedTenantId = signal<number | null>(null); // super_admin only
  selectedUserActive = signal<'any' | 'true' | 'false'>('any'); // users

  // Options
  roleOptions = signal<Array<{ label: string; value: string }>>([]);
  tenantOptions = signal<Array<{ label: string; value: string }>>([]);

  // Guards
  private initialized = signal(false);
  private requestSeq = 0;

  isSuperAdmin = computed(() => this.auth.currentUser()?.role_id === 1);

  // Tabs
  tabs = computed<GenericTab[]>(() => [
    { key: 'users', label: 'Users' },
    { key: 'warehouses', label: 'Warehouses' },
    { key: 'wifi', label: 'WiFi Profiles' },
  ]);

  // Facets vary by tab
  facets = computed<Facet[]>(() => {
    const list: Facet[] = [];
    if (this.activeTab() === 'users') {
      list.push({ key: 'role_id', label: 'Role', type: 'select', options: this.roleOptions() });
      list.push({ key: 'is_active', label: 'Status', type: 'select', options: [
        { label: 'Any', value: 'any' },
        { label: 'Active', value: 'true' },
        { label: 'Inactive', value: 'false' },
      ] });
      // Note: Backend does NOT support filtering users by warehouse; omitting warehouse facet.
    }
    if (this.isSuperAdmin()) {
      list.unshift({ key: 'tenant_id', label: 'Tenant', type: 'select', options: this.tenantOptions() });
    }
    return list;
  });

  // Columns vary by tab
  columns = computed<ColumnDef<MgmtRow>[]>(() => {
    switch (this.activeTab()) {
      case 'users':
        return [
          { header: 'ID', accessorKey: 'id' as any },
          { header: 'Username', accessorKey: 'user_name' as any },
          { header: 'Name', accessorKey: 'name' as any },
          { header: 'Email', accessorKey: 'email' as any },
          { header: 'Role ID', accessorKey: 'role_id' as any },
          { header: 'Tenant ID', accessorKey: 'tenant_id' as any },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No') },
          { header: 'Created', accessorKey: 'created_at' as any },
        ];
      case 'warehouses':
        return [
          { header: 'ID', accessorKey: 'id' as any },
          { header: 'Name', accessorKey: 'name' as any },
          { header: 'Description', accessorKey: 'description' as any },
          { header: 'Tenant ID', accessorKey: 'tenant_id' as any },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No') },
          { header: 'Created', accessorKey: 'created_at' as any },
        ];
      default:
        return [
          { header: 'ID', accessorKey: 'id' as any },
          { header: 'Name', accessorKey: 'name' as any },
          { header: 'SSID', accessorKey: 'ssid' as any },
          { header: 'Tenant ID', accessorKey: 'tenant_id' as any },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No') },
          { header: 'Created', accessorKey: 'created_at' as any },
        ];
    }
  });

  // Search placeholder per tab
  searchPlaceholder = computed(() => {
    switch (this.activeTab()) {
      case 'users':
        return 'Search by name, username, or email';
      case 'warehouses':
        return 'Search warehouses';
      default:
        return 'Search WiFi profiles';
    }
  });

  constructor() {
    // Hydrate from URL
    const qp = this.route.snapshot.queryParamMap;
    const num = (k: string, d: number) => {
      const v = qp.get(k); const n = Number(v); return Number.isFinite(n) ? n : d;
    };
    const optNum = (k: string) => {
      const v = qp.get(k); if (v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null;
    };
    const str = (k: string, d = '') => qp.get(k) ?? d;

    const tab = str('tab', 'users');
    if (tab === 'warehouses' || tab === 'wifi') this.activeTab.set(tab);
    else this.activeTab.set('users');

   
    this.search.set(str('search', ''));
    this.selectedRoleId.set(optNum('role_id'));
    this.selectedTenantId.set(optNum('tenant_id'));
    const ia = qp.get('is_active');
    this.selectedUserActive.set(ia === 'true' || ia === 'false' ? (ia as 'true' | 'false') : 'any');

    this.initialized.set(true);

    // Fetch options
    effect(() => {
      // Roles (super_admin only route)
      this.api.getRoles(new HttpParams().set('limit', '1000')).subscribe(res => {
        const opts = (res.data ?? []).map(r => ({ label: r.name, value: String(r.id) }));
        this.roleOptions.set(opts);
      });
    });

    effect(() => {
      if (!this.isSuperAdmin()) { this.tenantOptions.set([]); return; }
      this.api.getTenants(new HttpParams().set('limit', '1000')).subscribe(res => {
        const opts = (res.data ?? []).map(t => ({ label: t.name, value: String(t.id) }));
        this.tenantOptions.set(opts);
      });
    });

    // Fetch data when state changes
    effect(() => {
      if (!this.initialized()) return;
      this.activeTab();
      this.pageIndex();
      this.pageSize();
      this.search();
      this.selectedRoleId();
      this.selectedTenantId();
      this.selectedUserActive();
      this.fetchData();
    });

    // URL sync
    effect(() => {
      if (!this.initialized()) return;
      const query: Record<string, any> = {
        tab: this.activeTab(),
        page: this.pageIndex() + 1,
        limit: this.pageSize(),
      };
      const s = this.search().trim(); if (s) query['search'] = s;
      const rid = this.selectedRoleId(); if (rid != null && this.activeTab() === 'users') query['role_id'] = String(rid);
      if (this.isSuperAdmin()) {
        const tid = this.selectedTenantId(); if (tid != null) query['tenant_id'] = String(tid);
      }
      if (this.activeTab() === 'users' && this.selectedUserActive() !== 'any') query['is_active'] = this.selectedUserActive();
      this.router.navigate([], { queryParams: query, replaceUrl: true });
    });
  }

  private fetchData() {
    const seq = ++this.requestSeq;
    this.loading.set(true);

    const tab = this.activeTab();
    if (tab === 'users') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.search().trim(); if (s) params = params.set('search', s);
      const rid = this.selectedRoleId(); if (rid != null) params = params.set('role_id', String(rid));
      if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
      const ia = this.selectedUserActive(); if (ia !== 'any') params = params.set('is_active', ia === 'true' ? 'true' : 'false');
      this.api.getUsers(params).subscribe({
        next: (res) => { if (seq !== this.requestSeq) return; this.data.set(res.data ?? []); this.total.set(res.meta?.total ?? 0); this.loading.set(false); },
        error: () => { if (seq !== this.requestSeq) return; this.loading.set(false); },
      });
      return;
    }

    if (tab === 'warehouses') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.search().trim(); if (s) params = params.set('search', s);
      if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
      this.api.getWarehouses(params).subscribe({
        next: (res) => { if (seq !== this.requestSeq) return; this.data.set(res.data ?? []); this.total.set(res.meta?.total ?? 0); this.loading.set(false); },
        error: () => { if (seq !== this.requestSeq) return; this.loading.set(false); },
      });
      return;
    }

    // wifi - no server pagination; client-side filter + paginate
    let params = new HttpParams();
    if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
    this.api.getWifiProfiles(params).subscribe({
      next: (res) => {
        if (seq !== this.requestSeq) return;
        const all = (res.data ?? []) as WiFiProfile[];
        const s = this.search().trim().toLowerCase();
        const filtered = s ? all.filter(r => `${r.name} ${r.ssid}`.toLowerCase().includes(s)) : all;
        this.total.set(filtered.length);
        const start = this.pageIndex() * this.pageSize();
        const paged = filtered.slice(start, start + this.pageSize());
        this.data.set(paged);
        this.loading.set(false);
      },
      error: () => { if (seq !== this.requestSeq) return; this.loading.set(false); },
    });
  }

  // Handlers from GenericPage
  onPageChange(event: { pageIndex: number; pageSize: number }) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  onFiltersChange(event: { search: string; facets: Record<string, string> }) {
    this.search.set(event.search ?? '');
    const f = event.facets ?? {};
    const parseNum = (v?: string) => {
      if (!v) return null; const n = Number(v); return Number.isFinite(n) ? n : null;
    };
    if (this.isSuperAdmin()) this.selectedTenantId.set(parseNum(f['tenant_id']));
    if (this.activeTab() === 'users') {
      this.selectedRoleId.set(parseNum(f['role_id']));
      const ia = f['is_active']; this.selectedUserActive.set(ia === 'true' || ia === 'false' ? (ia as any) : 'any');
    }
    this.pageIndex.set(0); // reset
  }

  onSortingChange(_state: Array<{ id: string; desc: boolean }>) {
    // Not implementing server-side sorting now; could be added per tab later
  }

  onTabChange(key: string | null) {
    const k = (key ?? 'users') as 'users' | 'warehouses' | 'wifi';
    if (k !== this.activeTab()) {
      this.activeTab.set(k);
      // reset some filters per tab
      this.search.set('');
      this.pageIndex.set(0);
    }
  }
}

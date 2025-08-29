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
import { Tenant } from '../../core/models/tenant';

// Union to drive the generic table
export type MgmtRow = User | Warehouse | WiFiProfile | Tenant;

@Component({
  selector: 'app-management',
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
  activeTab = signal<'tenants' | 'users' | 'warehouses' | 'wifi'>('users');
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
  testerOptions = signal<Array<{ label: string; value: string }>>([]);
  wifiOptions = signal<Array<{ label: string; value: string }>>([]);

  // Resolve tester role id based on loaded roles (case-insensitive match)
  testerRoleId = computed<number | null>(() => {
    const match = this.roleOptions().find(r => r.label.toLowerCase() === 'tester');
    if (!match) return null;
    const n = Number(match.value);
    return Number.isFinite(n) ? n : null;
  });

  // Guards
  private initialized = signal(false);
  private requestSeq = 0;

  isSuperAdmin = computed(() => this.auth.currentUser()?.role_id === 1);

  // Tabs
  tabs = computed<GenericTab[]>(() => {
    const base: GenericTab[] = [
      { key: 'users', label: 'Users' },
      { key: 'warehouses', label: 'Warehouses' },
      { key: 'wifi', label: 'WiFi Profiles' },
    ];
    // Show Tenants first, only for super_admin
    return this.isSuperAdmin() ? [{ key: 'tenants', label: 'Tenants' }, ...base] : base;
  });

  // Header primary action per tab
  primaryAction = computed(() => {
    const t = this.activeTab();
    const label = t === 'tenants'
      ? 'Add Tenant'
      : t === 'users'
        ? 'Add User'
        : t === 'warehouses'
          ? 'Add Warehouse'
          : 'Add WiFi Profile';
    return { label } as { label: string };
  });

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

    // Tenant facet is irrelevant when viewing tenants tab itself
    if (this.isSuperAdmin() && this.activeTab() !== 'tenants') {
      list.unshift({ key: 'tenant_id', label: 'Tenant', type: 'select', options: this.tenantOptions() });
    }
    return list;
  });

  // Delete confirmation modal state
  isDeleteModalOpen = signal(false);
  deleteContext = signal<{ tab: 'tenants' | 'users' | 'warehouses' | 'wifi'; row: MgmtRow } | null>(null);

  openDeleteModal(tab: 'tenants' | 'users' | 'warehouses' | 'wifi', row: MgmtRow) {
    this.deleteContext.set({ tab, row });
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.deleteContext.set(null);
  }

  confirmDelete() {
    const ctx = this.deleteContext();
    if (!ctx) return;

    this.loading.set(true);
    let deleteObservable: any;

    if (ctx.tab === 'users') {
      deleteObservable = this.api.deleteUser((ctx.row as any).id);
    } else if (ctx.tab === 'warehouses') {
      deleteObservable = this.api.deleteWarehouse((ctx.row as any).id);
    } else if (ctx.tab === 'wifi') {
      deleteObservable = this.api.deleteWifiProfile((ctx.row as any).id);
    } else if (ctx.tab === 'tenants') {
      deleteObservable = this.api.deleteTenant((ctx.row as any).id);
    }

    if (deleteObservable) {
      deleteObservable.subscribe({
        next: () => {
          this.loading.set(false);
          this.closeDeleteModal();
          this.fetchData(); // Refresh the data
        },
        error: (error: any) => {
          console.error('Failed to delete:', error);
          this.loading.set(false);
          this.closeDeleteModal();
        }
      });
    }
  }

  // Columns vary by tab
  columns = computed<ColumnDef<MgmtRow>[]>(() => {
    switch (this.activeTab()) {
      case 'tenants':
        return [
          { header: 'ID', accessorKey: 'id' as any },
          { header: 'Name', accessorKey: 'name' as any },
          { header: 'Description', accessorKey: 'description' as any },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No') },
          {
            header: 'Actions',
            id: 'actions' as any,
            enableSorting: false as any,
            meta: {
              actions: [
                { key: 'edit', label: 'Edit', class: 'text-primary' },
                { key: 'delete', label: 'Delete', class: 'text-error' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      case 'users':
        return [
          { header: 'ID', accessorKey: 'id' as any },
          { header: 'Username', accessorKey: 'user_name' as any },
          { header: 'Name', accessorKey: 'name' as any },
          { header: 'Email', accessorKey: 'email' as any },
          { header: 'Role', accessorKey: 'role_name' as any },
          { header: 'Tenant', accessorKey: 'tenant_name' as any },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No') },
          {
            header: 'Actions',
            id: 'actions' as any,
            enableSorting: false as any,
            meta: {
              actions: [
                { key: 'edit', label: 'Edit', class: 'text-primary' },
                { key: 'delete', label: 'Delete', class: 'text-error' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      case 'warehouses':
        return [
          { header: 'ID', accessorKey: 'id' as any },
          { header: 'Name', accessorKey: 'name' as any },
          { header: 'Description', accessorKey: 'description' as any },
          { header: 'Tenant', accessorKey: 'tenant_name' as any },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No') },
          {
            header: 'Actions',
            id: 'actions' as any,
            enableSorting: false as any,
            meta: {
              actions: [
                { key: 'edit', label: 'Edit', class: 'text-primary' },
                { key: 'delete', label: 'Delete', class: 'text-error' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      default:
        return [
          { header: 'ID', accessorKey: 'id' as any },
          { header: 'Name', accessorKey: 'name' as any },
          { header: 'SSID', accessorKey: 'ssid' as any },
          { header: 'Tenant', accessorKey: 'tenant_name' as any },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No') },
          // Actions: assign tester, view assigned testers
          {
            header: 'Actions',
            id: 'actions' as any,
            enableSorting: false as any,
            meta: {
              actions: [
                { key: 'edit', label: 'Edit', class: 'text-primary' },
                { key: 'assign', label: 'Assign tester', class: 'text-secondary' },
                { key: 'view-assigned', label: 'View assigned testers' },
                { key: 'delete', label: 'Delete', class: 'text-error' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
    }
  });

  // Search placeholder per tab
  searchPlaceholder = computed(() => {
    switch (this.activeTab()) {
      case 'tenants':
        return 'Search tenants';
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
    if (tab === 'tenants' && this.isSuperAdmin()) this.activeTab.set('tenants');
    else if (tab === 'warehouses' || tab === 'wifi' || tab === 'users') this.activeTab.set(tab as any);
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
    if (tab === 'tenants') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.search().trim(); if (s) params = params.set('name', s);
      this.api.getTenants(params).subscribe({
        next: (res) => {
          if (seq !== this.requestSeq) return;
          this.data.set(res.data ?? []);
          this.total.set(res.meta?.total ?? 0);
          this.loading.set(false);
        },
        error: () => { if (seq !== this.requestSeq) return; this.loading.set(false); },
      });
      return;
    }

    if (tab === 'users') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.search().trim(); if (s) params = params.set('search', s);
      const rid = this.selectedRoleId(); if (rid != null) params = params.set('role_id', String(rid));
      if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
      const ia = this.selectedUserActive(); if (ia !== 'any') params = params.set('is_active', ia === 'true' ? 'true' : 'false');
      this.api.getUsers(params).subscribe({
        next: (res) => { 
          if (seq !== this.requestSeq) return; 
          const users = (res.data ?? []).map(u => ({
            ...u,
            role_name: u.role_name ?? String(u.role_id),
            tenant_name: u.tenant_name ?? String(u.tenant_id)
          }));
          this.data.set(users); 
          this.total.set(res.meta?.total ?? 0); 
          this.loading.set(false); 
        },
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
        next: (res) => { 
          if (seq !== this.requestSeq) return; 
          const warehouses = (res.data ?? []).map(w => ({
            ...w,
            tenant_name: w.tenant_name ?? String(w.tenant_id)
          }));
          this.data.set(warehouses); 
          this.total.set(res.meta?.total ?? 0); 
          this.loading.set(false); 
        },
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
        const all = ((res.data ?? []) as WiFiProfile[]).map(p => ({
          ...p,
          tenant_name: p.tenant_name ?? String(p.tenant_id)
        }));
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
    const k = (key ?? 'users') as 'tenants' | 'users' | 'warehouses' | 'wifi';
    if (k !== this.activeTab()) {
      this.activeTab.set(k);
      // reset some filters per tab
      this.search.set('');
      this.pageIndex.set(0);
    }
  }

  // Header primary action click - navigate to form pages
  onPrimaryActionClick() {
    const t = this.activeTab();
    if (t === 'tenants') {
      this.router.navigate(['/management/tenants/add']);
    } else if (t === 'users') {
      this.router.navigate(['/management/users/add']);
    } else if (t === 'warehouses') {
      this.router.navigate(['/management/warehouses/add']);
    } else {
      this.router.navigate(['/management/wifi-profiles/add']);
    }
  }

  // Cell actions from GenericPage
  onCellAction(event: { action: string; row: MgmtRow }) {
    const tab = this.activeTab();
    const row = event.row;

    // Handle edit actions
    if (event.action === 'edit') {
      if (tab === 'tenants') {
        // Pass row state for edit form as backend doesn't expose GET /tenants/:id
        this.router.navigate(['/management/tenants/edit', (row as any).id], { state: { data: row } });
      } else if (tab === 'users') {
        this.router.navigate(['/management/users/edit', row.id]);
      } else if (tab === 'warehouses') {
        this.router.navigate(['/management/warehouses/edit', row.id]);
      } else if (tab === 'wifi') {
        this.router.navigate(['/management/wifi-profiles/edit', row.id]);
      }
      return;
    }

    // Handle delete actions via modal
    if (event.action === 'delete') {
      this.openDeleteModal(tab, row);
      return;
    }

    // WiFi-specific actions
    if (tab === 'wifi') {
      const wifiRow = row as WiFiProfile;
      if (event.action === 'assign') {
        this.openAssignModal(wifiRow);
        return;
      }
      if (event.action === 'view-assigned') {
        this.openAssignedModal(wifiRow);
        return;
      }
    }
  }

  // Assign tester modal state
  isAssignModalOpen = signal(false);
  selectedWifiProfile = signal<WiFiProfile | null>(null);
  selectedAssignTesterId = signal<number | null>(null);
  selectedAssignProfileId = signal<number | null>(null);

  private loadTesterOptionsForTenant() {
    let params = new HttpParams().set('limit', '1000');
    const rid = this.testerRoleId();
    if (rid != null) params = params.set('role_id', String(rid));
    if (this.isSuperAdmin()) {
      const tid = this.selectedTenantId();
      if (tid != null) params = params.set('tenant_id', String(tid));
    }
    this.api.getUsers(params).subscribe(res => {
      const opts = (res.data ?? []).map(u => ({ label: u.user_name, value: String(u.id) }));
      this.testerOptions.set(opts);
    });
  }

  private loadWifiOptionsForTenant() {
    let params = new HttpParams();
    if (this.isSuperAdmin()) {
      const tid = this.selectedTenantId();
      if (tid != null) params = params.set('tenant_id', String(tid));
    }
    this.api.getWifiProfiles(params).subscribe(res => {
      const opts = (res.data ?? []).map(p => ({ label: `${p.name} (${p.ssid})`, value: String(p.id) }));
      this.wifiOptions.set(opts);
    });
  }

  openAssignModal(row: WiFiProfile) {
    this.selectedWifiProfile.set(row);
    this.selectedAssignTesterId.set(null);
    this.selectedAssignProfileId.set(null);
    this.isAssignModalOpen.set(true);
    this.loadTesterOptionsForTenant();
  }

  openAssignModalNoProfile() {
    this.selectedWifiProfile.set(null);
    this.selectedAssignTesterId.set(null);
    this.selectedAssignProfileId.set(null);
    this.isAssignModalOpen.set(true);
    this.loadWifiOptionsForTenant();
    this.loadTesterOptionsForTenant();
  }

  closeAssignModal() {
    this.isAssignModalOpen.set(false);
    this.selectedWifiProfile.set(null);
    this.selectedAssignTesterId.set(null);
    this.selectedAssignProfileId.set(null);
  }

  submitAssign() {
    const profile = this.selectedWifiProfile();
    const testerId = this.selectedAssignTesterId();
    const profileId = profile ? profile.id : this.selectedAssignProfileId();
    if (profileId == null || testerId == null) return;
    this.loading.set(true);
    this.api.assignWifiProfile(profileId, testerId).subscribe({
      next: () => { this.loading.set(false); this.closeAssignModal(); },
      error: () => { this.loading.set(false); },
    });
  }

  onAssignTesterSelect(event: Event) {
    const target = event.target as HTMLSelectElement | null;
    const value = target?.value?.trim();
    this.selectedAssignTesterId.set(value ? Number(value) : null);
  }

  onAssignProfileSelect(event: Event) {
    const target = event.target as HTMLSelectElement | null;
    const value = target?.value?.trim();
    this.selectedAssignProfileId.set(value ? Number(value) : null);
  }

  // View assigned testers modal
  isAssignedModalOpen = signal(false);
  assignedTesters = signal<User[]>([]);

  openAssignedModal(row: WiFiProfile) {
    this.selectedWifiProfile.set(row);
    this.isAssignedModalOpen.set(true);
    let params = new HttpParams();
    if (this.isSuperAdmin()) {
      const tid = this.selectedTenantId();
      if (tid != null) params = params.set('tenant_id', String(tid));
    }
    this.api.getWifiProfileTesters(row.id, params).subscribe({
      next: (res) => { this.assignedTesters.set(res.data ?? []); },
      error: () => { this.assignedTesters.set([]); },
    });
  }

  unassignTester(userId: number) {
    const profile = this.selectedWifiProfile();
    if (!profile) return;
    this.loading.set(true);
    this.api.unassignWifiProfile(profile.id, userId).subscribe({
      next: () => {
        // refresh list
        let params = new HttpParams();
        if (this.isSuperAdmin()) {
          const tid = this.selectedTenantId();
          if (tid != null) params = params.set('tenant_id', String(tid));
        }
        this.api.getWifiProfileTesters(profile.id, params).subscribe({
          next: (res) => { this.assignedTesters.set(res.data ?? []); this.loading.set(false); },
          error: () => { this.loading.set(false); },
        });
      },
      error: () => { this.loading.set(false); },
    });
  }

  closeAssignedModal() {
    this.isAssignedModalOpen.set(false);
    this.assignedTesters.set([]);
  }
}

import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericPageComponent } from '../../shared/components/generic-page/generic-page.component';
import type { GenericTab } from '../../shared/components/generic-page/generic-page.component';
import { ApiService } from '../../core/services/api.service';
import { Diagnostic } from '../../core/models/diagnostic';
import { ColumnDef } from '@tanstack/angular-table';
import { HttpParams } from '@angular/common/http';
import type { Facet } from '../../shared/components/generic-page/generic-page.component';
import { AuthService } from '../../core/services/auth.service';
import { DateCellComponent } from './date-cell.component';
import { ResultCellComponent } from './result-cell.component';
import { OrderCellComponent } from './order-cell.component';
import { ReportCellComponent } from './report-cell.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-diagnostics',
  imports: [CommonModule, GenericPageComponent],
  templateUrl: './diagnostics.component.html',
  styleUrl: './diagnostics.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticsComponent {
  private readonly apiService = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  loading = signal<boolean>(false);
  data = signal<Diagnostic[]>([]);
  total = signal<number>(0);
  pageIndex = signal<number>(0);
  pageSize = signal<number>(10);
  // Server-driven filters
  identifier = signal<string>('');
  sortBy = signal<string | null>(null);
  sortDir = signal<'asc' | 'desc' | null>(null);
  deviceType = signal<string>('');
  // Facet selections
  selectedWarehouseId = signal<number | null>(null);
  selectedTesterId = signal<number | null>(null);
  selectedTenantId = signal<number | null>(null);

  // Facet options
  warehouseOptions = signal<Array<{ label: string; value: string }>>([]);
  testerOptions = signal<Array<{ label: string; value: string }>>([]);
  tenantOptions = signal<Array<{ label: string; value: string }>>([]);

  // Hydration flag to prevent double fetch
  private readonly initialized = signal(false);
  // Request sequencing to avoid race conditions (stale responses)
  private requestSeq = 0;

  // Role checks
  isSuperAdmin = computed(() => this.auth.currentUser()?.role_id === 1);

  // Export functionality
  isExporting = signal<boolean>(false);
  
  // Primary action for export
  primaryAction = computed(() => ({
    label: 'Export CSV',
    icon: 'download'
  }));

  // Tabs: filter by device type
  tabs = computed<GenericTab[]>(() => [
    { key: '', label: 'All' },
    { key: 'iPhone', label: 'iPhone' },
    { key: 'Macbook', label: 'Macbook' },
    { key: 'Airpods', label: 'Airpods' },
    { key: 'Android', label: 'Android' },
  ]);

  // Facets configuration
  facets = signal<Facet[]>([]);

  columns = computed<ColumnDef<Diagnostic>[]>(() => [
    // 1) Order number starting at 1 across pages
    {
      header: 'S.No',
      id: 'order',
      enableSorting: false as any,
      meta: {
        cellComponent: OrderCellComponent,
        cellComponentData: (_row: Diagnostic, cell: any) => ({ base: this.pageIndex() * this.pageSize(), idx: cell.row.index }),
        cellClass: () => 'text-left w-12',
      },
    },
    // 2) PDF icon to detailed report
    {
      header: '',
      id: 'report',
      enableSorting: false as any,
      meta: {
        cellComponent: ReportCellComponent,
        cellComponentData: (row: Diagnostic) => ({ row }),
        cellClass: () => 'text-center w-10',
      },
    },
    // 3) Result and date
    {
      header: 'Tested',
      id: 'tested',
      enableSorting: false as any,
      meta: {
        cellComponent: ResultCellComponent,
        cellComponentData: (row: Diagnostic) => ({ row, openDetails: (r: Diagnostic) => this.openResultModal(r) }),
        cellClass: () => 'text-center',
      },
    },
    {
      header: 'Tested Date',
      accessorKey: 'created_at',
      meta: {
        cellComponent: DateCellComponent,
        cellComponentData: (row: Diagnostic) => ({ value: row.created_at }),
      },
    },
    // Identifiers: IMEI then LPN side by side
    { header: 'IMEI', accessorKey: 'imei' },
    { header: 'LPN', accessorKey: 'lpn' },
    { header: 'Serial Number', accessorKey: 'serial_number' },
    // Device info
    { header: 'Make', accessorKey: 'make' },
    { header: 'Model', accessorKey: 'model_name' },
    { header: 'Tester', accessorKey: 'tester_username' },
    { header: 'OS', accessorKey: 'os_version' },
    { header: 'Storage', accessorKey: 'device_storage' },
    { header: 'Color', accessorKey: 'device_color' },
    { header: 'Device Lock', accessorKey: 'device_lock' },
    { header: 'OEM', accessorKey: 'oem_status' },
    {
      header: 'Battery',
      id: 'battery_summary',
      accessorFn: (row) => this.batterySummary(row),
      enableSorting: false as any,
    },
  ]);

  constructor() {
    // 1) Hydrate initial state from URL (snapshot) before effects run
    const qp = this.route.snapshot.queryParamMap;
    const num = (k: string, d: number) => {
      const v = qp.get(k);
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    const str = (k: string, d: string = '') => qp.get(k) ?? d;
    const optStr = (k: string) => {
      const v = qp.get(k);
      return v == null ? '' : v;
    };
    const optNum = (k: string) => {
      const v = qp.get(k);
      if (v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };


    this.identifier.set(str('identifier', ''));
    const sb = qp.get('sort_by');
    const sd = qp.get('sort_dir') as 'asc' | 'desc' | null;
    this.sortBy.set(sb ?? null);
    this.sortDir.set(sd ?? null);
    this.deviceType.set(optStr('device_type'));
    this.selectedWarehouseId.set(optNum('warehouse_id'));
    this.selectedTesterId.set(optNum('tester_id'));
    this.selectedTenantId.set(optNum('tenant_id'));
    this.initialized.set(true);

    // Recompute facets when options or role change
    effect(() => {
      const fs: Facet[] = [
        { key: 'warehouse_id', label: 'Warehouse', type: 'select', options: this.warehouseOptions() },
        { key: 'tester_id', label: 'Tester', type: 'select', options: this.testerOptions() },
      ];
      if (this.isSuperAdmin()) {
        fs.unshift({ key: 'tenant_id', label: 'Tenant', type: 'select', options: this.tenantOptions() });
      }
      this.facets.set(fs);
    });

    // 2) Fetch data when state changes
    effect(() => {
      if (!this.initialized()) return; // avoid initial double fetch during hydration
      // create reactive dependencies
      this.pageIndex();
      this.pageSize();
      this.identifier();
      this.sortBy();
      this.sortDir();
      this.deviceType();
      this.selectedWarehouseId();
      this.selectedTesterId();
      if (this.isSuperAdmin()) this.selectedTenantId();
      this.fetchData();
    });

    // 3) Keep URL in sync so the state is shareable
    effect(() => {
      if (!this.initialized()) return;
      const query: Record<string, any> = {
        page: this.pageIndex() + 1,
        limit: this.pageSize(),
      };
      const idf = this.identifier().trim();
      if (idf) query['identifier'] = idf;
      const sb2 = this.sortBy();
      const sd2 = this.sortDir();
      if (sb2) query['sort_by'] = sb2;
      if (sd2) query['sort_dir'] = sd2;
      const dt = this.deviceType();
      if (dt) query['device_type'] = dt;
      const wid = this.selectedWarehouseId();
      if (wid != null) query['warehouse_id'] = String(wid);
      const tidTester = this.selectedTesterId();
      if (tidTester != null) query['tester_id'] = String(tidTester);
      if (this.isSuperAdmin()) {
        const tenantId = this.selectedTenantId();
        if (tenantId != null) query['tenant_id'] = String(tenantId);
      }
      // Replace URL to avoid history spam when paginating
      this.router.navigate([], { queryParams: query, replaceUrl: true });
    });

    // Load warehouses whenever selected tenant changes (for super_admin) or at init
    effect(() => {
      const paramsBase = new HttpParams().set('limit', '1000');
      const isSa = this.isSuperAdmin();
      const tid = this.selectedTenantId();
      let params = paramsBase;
      if (isSa && tid != null) params = params.set('tenant_id', String(tid));
      this.apiService.getWarehouses(params).subscribe(res => {
        const opts = (res.data ?? []).map(w => ({ label: w.name, value: String(w.id) }));
        this.warehouseOptions.set(opts);
      });
    });

    // Load testers whenever selected tenant changes (for super_admin) or at init
    effect(() => {
      let params = new HttpParams().set('limit', '1000').set('role_id', '3');
      const isSa = this.isSuperAdmin();
      const tid = this.selectedTenantId();
      if (isSa && tid != null) params = params.set('tenant_id', String(tid));
      this.apiService.getUsers(params).subscribe(res => {
        const opts = (res.data ?? []).map(u => ({ label: u.user_name, value: String(u.id) }));
        this.testerOptions.set(opts);
      });
    });

    // Load tenants options for super_admin
    effect(() => {
      if (!this.isSuperAdmin()) {
        this.tenantOptions.set([]);
        return;
      }
      const params = new HttpParams().set('limit', '1000');
      this.apiService.getTenants(params).subscribe(res => {
        const opts = (res.data ?? []).map(t => ({ label: t.name, value: String(t.id) }));
        this.tenantOptions.set(opts);
      });
    });
  }

  fetchData() {
    const seq = ++this.requestSeq;
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', String(this.pageIndex() + 1))
      .set('limit', String(this.pageSize()));

    const idf = this.identifier().trim();
    if (idf) params = params.set('identifier', idf);
    const sb = this.sortBy();
    const sd = this.sortDir();
    if (sb) params = params.set('sort_by', sb);
    if (sd) params = params.set('sort_dir', sd);
    const dt = this.deviceType();
    if (dt) params = params.set('device_type', dt);

    const wid = this.selectedWarehouseId();
    if (wid != null) params = params.set('warehouse_id', String(wid));
    const tidTester = this.selectedTesterId();
    if (tidTester != null) params = params.set('tester_id', String(tidTester));
    if (this.isSuperAdmin()) {
      const tenantId = this.selectedTenantId();
      if (tenantId != null) params = params.set('tenant_id', String(tenantId));
    }

    this.apiService.getDiagnostics(params).subscribe({
      next: (res) => {
        if (seq !== this.requestSeq) return; // stale response, ignore
        this.data.set(res.data);
        this.total.set(res.meta?.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        if (seq !== this.requestSeq) return; // stale response, ignore
        this.loading.set(false);
      },
    });
  }

  onPageChange(event: { pageIndex: number; pageSize: number }) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  onFiltersChange(event: { search: string; facets: Record<string, string> }) {
    this.identifier.set(event.search ?? '');
    const f = event.facets ?? {};
    const parse = (v: string | undefined) => {
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    this.selectedWarehouseId.set(parse(f['warehouse_id']));
    this.selectedTesterId.set(parse(f['tester_id']));
    if (this.isSuperAdmin()) this.selectedTenantId.set(parse(f['tenant_id']));
    // Reset pagination on filters change
    this.pageIndex.set(0);
  }

  onSortingChange(state: Array<{ id: string; desc: boolean }>) {
    const first = state?.[0];
    if (first) {
      this.sortBy.set(first.id);
      this.sortDir.set(first.desc ? 'desc' : 'asc');
    } else {
      this.sortBy.set(null);
      this.sortDir.set(null);
    }
  }

  onTabChange(key: string | null) {
    this.deviceType.set(key ?? '');
    this.pageIndex.set(0);
  }

  // Modal state and helpers
  protected readonly isModalOpen = signal(false);
  protected readonly selected = signal<Diagnostic | null>(null);

  protected openResultModal(row: Diagnostic) {
    this.selected.set(row);
    this.isModalOpen.set(true);
  }

  protected closeModal() {
    this.isModalOpen.set(false);
    this.selected.set(null);
  }

  private parseComponents(value: string | null): string[] {
    if (!value) return [];
    const v = String(value).trim();
    if (!v) return [];
    try {
      // try JSON first
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(x => String(x)).filter(Boolean);
    } catch {}
    // fallback: split by comma/semicolon
    return v
      .split(/[;,]/g)
      .map(s => s.trim())
      .filter(Boolean);
  }

  protected passedComponents = computed(() => this.parseComponents(this.selected()?.passed_components ?? null));
  protected failedComponents = computed(() => this.parseComponents(this.selected()?.failed_components ?? null));
  protected pendingComponents = computed(() => this.parseComponents(this.selected()?.pending_components ?? null));

  protected selectedStatus = computed<'failed' | 'pending' | 'success'>(() => {
    const s = this.selected();
    if (!s) return 'success';
    if ((s.failed_components ?? '').trim()) return 'failed';
    if ((s.pending_components ?? '').trim()) return 'pending';
    return 'success';
  });

  protected selectedStatusLabel = computed<string>(() => {
    const s = this.selectedStatus();
    if (s === 'failed') return 'Diagnostic Failed';
    if (s === 'pending') return 'Diagnostic Pending';
    return 'Diagnostic Successful';
  });

  protected selectedBadgeClass = computed<string>(() => {
    const s = this.selectedStatus();
    if (s === 'failed') return 'badge-error';
    if (s === 'pending') return 'badge-warning';
    return 'badge-success';
  });

  protected batterySummary(row: Diagnostic): string {
    const info = row.battery_info as any;
    if (!info) return 'N/A';
    // Try common fields if present
    const parts: string[] = [];
    if (typeof info === 'object') {
      if (info.health) parts.push(`Health: ${info.health}`);
      if (info.cycle_count ?? info.cycles) parts.push(`Cycles: ${info.cycle_count ?? info.cycles}`);
      if (info.capacity) parts.push(`Cap: ${info.capacity}`);
    }
    return parts.length ? parts.join(' · ') : 'N/A';
  }

  onExportClick() {
    this.exportData();
  }

  private exportData() {
    this.isExporting.set(true);
    
    // Build the same parameters used for fetching data
    let params = new HttpParams();
    
    const idf = this.identifier().trim();
    if (idf) params = params.set('identifier', idf);
    const sb = this.sortBy();
    const sd = this.sortDir();
    if (sb) params = params.set('sort_by', sb);
    if (sd) params = params.set('sort_dir', sd);
    const dt = this.deviceType();
    if (dt) params = params.set('device_type', dt);

    const wid = this.selectedWarehouseId();
    if (wid != null) params = params.set('warehouse_id', String(wid));
    const tidTester = this.selectedTesterId();
    if (tidTester != null) params = params.set('tester_id', String(tidTester));
    if (this.isSuperAdmin()) {
      const tenantId = this.selectedTenantId();
      if (tenantId != null) params = params.set('tenant_id', String(tenantId));
    }

    // Call the export endpoint
    this.apiService.exportDiagnostics(params).subscribe({
      next: (blob: Blob) => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename with timestamp and filters
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        let filename = `test_results_${timestamp}`;
        
        // Add filter info to filename if any filters are applied
        const filterParts: string[] = [];
        if (idf) filterParts.push(`search-${idf.replace(/[^a-zA-Z0-9]/g, '_')}`);
        if (dt) filterParts.push(`type-${dt}`);
        if (wid != null) filterParts.push(`warehouse-${wid}`);
        if (tidTester != null) filterParts.push(`tester-${tidTester}`);
        
        if (filterParts.length > 0) {
          filename += `_${filterParts.join('_')}`;
        }
        
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.isExporting.set(false);
      },
      error: (error: any) => {
        console.error('Export failed:', error);
        this.isExporting.set(false);
        // You could add a toast notification here
      }
    });
  }
}
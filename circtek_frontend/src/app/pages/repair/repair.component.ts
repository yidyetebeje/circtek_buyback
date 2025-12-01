import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColumnDef } from '@tanstack/angular-table';
import { HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { GenericPageComponent, type Facet, type GenericTab } from '../../shared/components/generic-page/generic-page.component';
import { GenericModalComponent, type ModalAction } from '../../shared/components/generic-modal/generic-modal.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PaginationService } from '../../shared/services/pagination.service';
import { ToastService } from '../../core/services/toast.service';
import { RepairRecord } from '../../core/models/repair';
import { RepairReasonRecord } from '../../core/models/repair-reason';
import { DeadIMEIRecord } from '../../core/models/dead-imei';
import { SkuUsageAnalyticsItem } from '../../core/models/analytics';
import { ROLE_ID } from '../../core/constants/role.constants';

// Union type for table rows across tabs
export type RepairRow = RepairRecord | RepairReasonRecord | DeadIMEIRecord | SkuUsageAnalyticsItem;

@Component({
  selector: 'app-repair',
  imports: [CommonModule, GenericPageComponent, GenericModalComponent],
  templateUrl: './repair.component.html',
  styleUrls: ['./repair.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepairComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paginationService = inject(PaginationService);
  private readonly toast = inject(ToastService);

  // State
  loading = signal(false);
  data = signal<RepairRow[]>([]);
  total = signal(0);

  // Tabs & pagination
  activeTab = signal<'repairs' | 'repair-reasons' | 'dead-imei' | 'analytics'>('repairs');
  pageIndex = signal(0);
  pageSize = signal(10);

  // Filters (shared + per tab)
  search = signal('');
  startDate = signal<string | null>(null); // repairs date range
  endDate = signal<string | null>(null); // repairs date range
  selectedWarehouseId = signal<number | null>(null); // dead-imei and analytics
  repairReasonStatus = signal<'true' | 'false'>('true'); // repair-reasons
  groupByBatch = signal<boolean>(false); // analytics

  // Validation
  dateRangeError = computed<string | null>(() => {
    if (this.activeTab() !== 'repairs') return null;
    const s = this.startDate();
    const e = this.endDate();
    if (!s || !e) return null;
    // Facet inputType is 'date', which yields YYYY-MM-DD values; lexical compare is safe
    return s > e ? 'Start Date cannot be later than End Date.' : null;
  });

  // Analytics filters
  periodDays = signal<number>(30); // analytics
  analyticsStartDate = signal<string | null>(null); // analytics
  analyticsEndDate = signal<string | null>(null); // analytics

  // Sorting (server-side)
  sortBy = signal<string | null>(null);
  sortDir = signal<'asc' | 'desc' | null>(null);

  // Options
  warehouseOptions = signal<Array<{ label: string; value: string }>>([]);

  // Delete confirmation modal state
  isDeleteModalOpen = signal(false);
  deleteContext = signal<RepairRecord | null>(null);

  deleteModalActions = computed<ModalAction[]>(() => [
    {
      label: 'Cancel',
      variant: 'ghost',
      action: 'cancel'
    },
    {
      label: 'Delete',
      variant: 'error',
      action: 'delete'
    }
  ]);

  // Guards
  private initialized = signal(false);
  private requestSeq = 0;
  // Track last emitted URL query to avoid redundant navigations
  private _lastQueryNorm = signal<string>('');

  // Check if user can access repair reasons (admin/super admin only)
  canAccessRepairReasons = computed(() => {
    const user = this.auth.currentUser();
    return user?.role_id === ROLE_ID.ADMIN || user?.role_id === ROLE_ID.SUPER_ADMIN;
  });

  // Tabs
  tabs = computed<GenericTab[]>(() => {
    const allTabs = [
      { key: 'repairs', label: 'Repairs' },
      { key: 'repair-reasons', label: 'Repair Reasons' },
      { key: 'dead-imei', label: 'Dead IMEI' },
      { key: 'analytics', label: 'Usage Analytics' },
    ];

    // Filter out repair-reasons tab for non-admin users
    if (!this.canAccessRepairReasons()) {
      return allTabs.filter(tab => tab.key !== 'repair-reasons');
    }

    return allTabs;
  });

  // Header
  title = 'Repair Management';
  subtitle = 'Manage repairs, repair reasons, dead IMEI records and usage analytics';
  headerActions = computed(() => {
    const tab = this.activeTab();
    if (tab === 'repairs') {
      return [
        { key: 'create-repair', label: 'Create Repair', variant: 'btn-primary' },
        { key: 'export-csv', label: 'Export CSV', variant: 'btn-outline' }
      ];
    } else if (tab === 'repair-reasons') {
      return [{ key: 'add-repair-reason', label: 'Add Repair Reason', variant: 'btn-primary' }];
    } else if (tab === 'dead-imei') {
      return [{ key: 'add-dead-imei', label: 'Add Dead IMEI', variant: 'btn-primary' }];
    } else if (tab === 'analytics') {
      return [{ key: 'view-analytics', label: 'View Detailed Analytics', variant: 'btn-primary' }];
    }
    return null;
  });

  // Check if custom date range is selected for analytics
  isCustomDateRange = computed(() => {
    const tab = this.activeTab();
    if (tab === 'analytics') {
      const hasCustomDates = this.analyticsStartDate() || this.analyticsEndDate();
      return hasCustomDates;
    }
    return false;
  });

  // Check if custom period is selected for analytics
  isCustomPeriod = computed(() => {
    const tab = this.activeTab();
    if (tab === 'analytics') {
      return this.analyticsStartDate() || this.analyticsEndDate();
    }
    return false;
  });

  // Get the current period value for the dropdown
  currentPeriodValue = computed(() => {
    if (this.activeTab() === 'analytics') {
      if (this.isCustomPeriod()) {
        return 'custom';
      }
      return String(this.periodDays());
    }
    return '30';
  });

  // Facets per tab
  facets = computed<Facet[]>(() => {
    const list: Facet[] = [];
    const tab = this.activeTab();

    if (tab === 'repairs') {
      list.push({ key: 'start_date', label: 'Start Date', type: 'text', inputType: 'date' });
      list.push({ key: 'end_date', label: 'End Date', type: 'text', inputType: 'date' });
    }
    if (tab === 'repair-reasons') {
      list.push({
        key: 'status', label: 'Status', type: 'select', options: [
          { label: 'Active', value: 'true' },
          { label: 'Inactive', value: 'false' },
        ]
      });
    }
    if (tab === 'dead-imei') {
      list.push({ key: 'warehouse_id', label: 'Warehouse', type: 'select', options: this.warehouseOptions() });
    }
    if (tab === 'analytics') {
      list.push({ key: 'warehouse_id', label: 'Warehouse', type: 'select', options: this.warehouseOptions() });
      list.push({
        key: 'period_days', label: 'Period', type: 'select', options: [
          { label: 'Last 7 days', value: '7' },
          { label: 'Last 30 days', value: '30' },
          { label: 'Last 60 days', value: '60' },
          { label: 'Last 90 days', value: '90' },
          { label: 'Custom Range', value: 'custom' }
        ]
      });
      list.push({
        key: 'group_by_batch', label: 'Group by Batch', type: 'select', options: [
          { label: 'No (Show individual SKUs)', value: 'false' },
          { label: 'Yes (Group by base SKU)', value: 'true' }
        ]
      });
      // Only show date fields when custom range is selected
      if (this.isCustomDateRange()) {
        list.push({ key: 'analytics_start_date', label: 'Start Date', type: 'text', placeholder: 'YYYY-MM-DD' });
        list.push({ key: 'analytics_end_date', label: 'End Date', type: 'text', placeholder: 'YYYY-MM-DD' });
      }
    }
    return list;
  });

  // Columns per tab
  columns = computed<ColumnDef<RepairRow>[]>(() => {
    switch (this.activeTab()) {
      case 'repairs':
        return [
          {
            header: 'IMEI/Serial', id: 'device_identifier' as any, accessorFn: (r: any) => {
              return r.device_imei || r.device_serial || 'N/A';
            }, meta: { truncateText: true, truncateMaxWidth: '150px' }
          },
          {
            header: 'Parts Used', id: 'parts_used', accessorFn: (r: any) => {
              // Check for consumed items from repair
              if (r.consumed_items && r.consumed_items.length > 0) {
                const displayParts: string[] = [];

                for (const item of r.consumed_items) {
                  // For fixed_price items, show the reason
                  if (item.part_sku === 'fixed_price' && item.reason) {
                    displayParts.push(item.reason);
                  }
                  // For regular parts, show the part SKU
                  else if (item.part_sku && item.part_sku !== 'fixed_price') {
                    displayParts.push(item.part_sku);
                  }
                }

                return displayParts.length > 0 ? displayParts.join(', ') : 'No parts used';
              }
              return 'No parts used';
            }, meta: { wrapText: true }
          },
          { header: 'Repairer', accessorKey: 'repairer_name' as any, meta: { truncateText: true, truncateMaxWidth: '120px' } },
          {
            header: 'Actions', id: 'actions' as any, enableSorting: false as any,
            meta: {
              actions: [
                { key: 'detail', label: 'View Details', class: 'text-info', icon: 'eye' },
                { key: 'delete', label: 'Delete', class: 'text-error', icon: 'delete' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      case 'repair-reasons':
        return [
          {
            header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
              const idx = this.data().indexOf(r as any);
              const base = this.pageIndex() * this.pageSize();
              return base + (idx >= 0 ? idx : 0) + 1;
            }
          },
          { header: 'Name', accessorKey: 'name' as any, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          { header: 'Description', accessorKey: 'description' as any, meta: { truncateText: true, truncateMaxWidth: '250px' } },
          {
            header: 'Status', id: 'status' as any, accessorFn: (r: any) => r.status ? 'Active' : 'Inactive',
            meta: {
              cellClass: (r: any) => r.status ? 'text-success font-medium' : 'text-error font-medium'
            }
          },
          {
            header: 'Actions', id: 'actions' as any, enableSorting: false as any,
            meta: {
              actions: (row: any) => [
                { key: 'edit', label: 'Edit', class: 'text-primary', icon: 'edit' },
                {
                  key: 'toggle-status',
                  label: row.status ? 'Disable' : 'Enable',
                  class: row.status ? 'text-warning' : 'text-success',
                  icon: row.status ? 'x' : 'check'
                },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      case 'dead-imei':
        return [
          {
            header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
              const idx = this.data().indexOf(r as any);
              const base = this.pageIndex() * this.pageSize();
              return base + (idx >= 0 ? idx : 0) + 1;
            }
          },
          { header: 'Device ID', accessorKey: 'device_id' as any },
          { header: 'SKU', accessorKey: 'sku' as any },
          { header: 'IMEI', accessorKey: 'device_imei' as any },
          { header: 'Serial', accessorKey: 'device_serial' as any },
          { header: 'Warehouse', accessorKey: 'warehouse_name' as any },
          { header: 'Notes', accessorKey: 'notes' as any, meta: { truncateText: true, truncateMaxWidth: '200px' } },
          { header: 'Actor', accessorKey: 'actor_name' as any },
          { header: 'Created', accessorKey: 'created_at' as any },
          {
            header: 'Actions', id: 'actions' as any, enableSorting: false as any,
            meta: {
              actions: [
                { key: 'detail', label: 'View Details', class: 'text-info' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      case 'analytics':
        return [
          {
            header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
              const idx = this.data().indexOf(r as any);
              const base = this.pageIndex() * this.pageSize();
              return base + (idx >= 0 ? idx : 0) + 1;
            }
          },
          { header: 'Warehouse', accessorKey: 'warehouse_name' as any },
          { header: 'Part SKU', accessorKey: 'part_sku' as any, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          { header: 'Qty Used', accessorKey: 'quantity_used' as any },
          { header: 'Current Stock', accessorKey: 'current_stock' as any },
          { header: 'Usage/Day', accessorFn: (r: any) => r.usage_per_day?.toFixed(2) || '0' },
          {
            header: 'Days Until Empty', id: 'expected_days_until_empty', accessorFn: (r: any) => {
              const days = r.expected_days_until_empty;
              if (days === null || days === undefined) return '∞';
              if (days <= 0) return 'Out of Stock';
              if (days <= 30) return `${days} days (⚠️)`;
              return `${days} days`;
            }
          },
          { header: 'Period', id: 'period_info', accessorFn: (r: any) => `${r.period_days} days` },
        ];
      default:
        return [];
    }
  });

  // Search placeholder per tab
  searchPlaceholder = computed(() => {
    switch (this.activeTab()) {
      case 'repairs': return 'IMEI, serial, repairer, parts, reasons';
      case 'repair-reasons': return 'Name, description';
      case 'dead-imei': return 'Device ID, SKU, IMEI, serial';
      case 'analytics': return 'Part SKU';
      default: return 'Search';
    }
  });

  constructor() {
    // Hydrate from URL
    const qp = this.route.snapshot.queryParamMap;
    const num = (k: string, d: number) => { const v = qp.get(k); const n = Number(v); return Number.isFinite(n) ? n : d; };
    const optNum = (k: string) => { const v = qp.get(k); if (v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
    const str = (k: string, d = '') => qp.get(k) ?? d;

    const tab = str('tab', 'repairs');
    // Prevent non-admin users from accessing repair-reasons tab via URL
    const user = this.auth.currentUser();
    const isAdmin = user?.role_id === ROLE_ID.ADMIN || user?.role_id === ROLE_ID.SUPER_ADMIN;

    if (tab === 'repairs' || tab === 'repair-reasons' || tab === 'dead-imei' || tab === 'analytics') {
      // If trying to access repair-reasons without admin rights, redirect to repairs tab
      if (tab === 'repair-reasons' && !isAdmin) {
        this.activeTab.set('repairs');
      } else {
        this.activeTab.set(tab as any);
      }
    } else {
      this.activeTab.set('repairs');
    }

    this.pageIndex.set(Math.max(0, num('page', 1) - 1));
    // Use pagination service with URL fallback
    const urlPageSize = num('limit', 0);
    const preferredPageSize = this.paginationService.getPageSizeWithFallback(urlPageSize > 0 ? urlPageSize : null);
    this.pageSize.set(preferredPageSize);
    this.search.set(str('search', ''));

    // Sorting from URL
    const sb = qp.get('sort_by');
    const sd = qp.get('sort_dir') as 'asc' | 'desc' | null;
    this.sortBy.set(sb ?? null);
    this.sortDir.set(sd ?? null);

    this.startDate.set(str('start_date') || null);
    this.endDate.set(str('end_date') || null);
    this.selectedWarehouseId.set(optNum('warehouse_id'));
    const rrs = str('repair_reason_status', 'true'); this.repairReasonStatus.set(rrs === 'false' ? 'false' : 'true');
    this.groupByBatch.set(str('group_by_batch') === 'true');

    // Analytics parameters
    const urlPeriodParam = qp.get('period_days');
    if (urlPeriodParam === 'custom') {
      // Keep default period but load custom dates
      this.periodDays.set(30);
    } else {
      const urlPeriodDays = num('period_days', 30);
      this.periodDays.set(this.normalizePeriodDays(urlPeriodDays));
    }
    this.analyticsStartDate.set(qp.get('analytics_start_date'));
    this.analyticsEndDate.set(qp.get('analytics_end_date'));

    this.initialized.set(true);

    // Initialize last emitted query from current snapshot to prevent immediate redundant navigation
    const currentFromUrl: Record<string, string> = {};
    for (const key of qp.keys) {
      const v = qp.get(key);
      if (v != null) currentFromUrl[key] = v;
    }
    this._lastQueryNorm.set(this._normalizeQuery(currentFromUrl));

    // Load options
    effect(() => {
      // Load warehouses for selects (limit high for options)
      this.api.getWarehouses(new HttpParams().set('limit', '1000')).subscribe(res => {
        const currentUser = this.auth.currentUser();
        const isAdmin = currentUser?.role_id === ROLE_ID.ADMIN || currentUser?.role_id === ROLE_ID.SUPER_ADMIN;
        let warehouses = res.data ?? [];

        // Filter warehouses for non-admin users
        if (!isAdmin && currentUser?.warehouse_id) {
          warehouses = warehouses.filter(w => w.id === currentUser.warehouse_id);
          // Auto-select warehouse for non-admin users if not already set
          if (this.selectedWarehouseId() === null) {
            this.selectedWarehouseId.set(currentUser.warehouse_id);
          }
        }

        const opts = warehouses.map(w => ({ label: w.name, value: String(w.id) }));
        this.warehouseOptions.set(opts);
      });
    });

    // Fetch data on state change
    effect(() => {
      if (!this.initialized()) return;
      this.activeTab();
      this.pageIndex();
      this.pageSize();
      this.search();
      this.sortBy();
      this.sortDir();
      // repairs
      this.startDate();
      this.endDate();
      // dead-imei
      this.selectedWarehouseId();
      // repair-reasons
      this.repairReasonStatus();
      // analytics
      this.periodDays();
      this.analyticsStartDate();
      this.analyticsEndDate();
      this.groupByBatch();
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

      if (this.activeTab() === 'repairs') {
        if (!this.dateRangeError()) {
          const startDate = this.startDate(); if (startDate) query['start_date'] = startDate;
          const endDate = this.endDate(); if (endDate) query['end_date'] = endDate;
        }
      }
      if (this.activeTab() === 'repair-reasons') {
        query['repair_reason_status'] = this.repairReasonStatus();
      }
      if (this.activeTab() === 'dead-imei') {
        const wid = this.selectedWarehouseId(); if (wid != null) query['warehouse_id'] = String(wid);
      }
      if (this.activeTab() === 'analytics') {
        const sb = this.sortBy(); if (sb) query['sort_by'] = sb;
        const sd = this.sortDir(); if (sd) query['sort_dir'] = sd;
        const wid = this.selectedWarehouseId(); if (wid != null) query['warehouse_id'] = String(wid);
        if (this.groupByBatch()) query['group_by_batch'] = 'true';
        if (this.isCustomPeriod()) {
          query['period_days'] = 'custom';
          const asd = this.analyticsStartDate(); if (asd) query['analytics_start_date'] = asd;
          const aed = this.analyticsEndDate(); if (aed) query['analytics_end_date'] = aed;
        } else {
          if (this.periodDays() !== 30) query['period_days'] = String(this.periodDays());
        }
      }

      // Only navigate if normalized query differs from last emitted
      const desiredNorm = this._normalizeQuery(query);
      if (desiredNorm !== this._lastQueryNorm()) {
        this._lastQueryNorm.set(desiredNorm);
        this.router.navigate([], { queryParams: query, replaceUrl: true });
      }
    });
  }

  // Normalize a query object to a stable string: omit empty, sort keys, stringify values
  private _normalizeQuery(obj: Record<string, any>): string {
    const out: Record<string, string> = {};
    Object.keys(obj).forEach(k => {
      const val = (obj as any)[k];
      if (val == null || val === '') return;
      out[k] = String(val);
    });
    const keys = Object.keys(out).sort();
    return keys.map(k => `${k}=${out[k]}`).join('&');
  }

  // Normalize period days to valid values (7, 30, 90, 180, 365)
  private normalizePeriodDays(days: number): number {
    if (days <= 7) return 7;
    if (days <= 30) return 30;
    if (days <= 90) return 90;
    if (days <= 180) return 180;
    return 365;
  }

  private fetchData() {
    const seq = ++this.requestSeq;
    this.loading.set(true);
    const tab = this.activeTab();

    if (tab === 'repairs') {
      // Guard against invalid date range; do not fetch and surface no results
      if (this.dateRangeError()) {
        this.data.set([]);
        this.total.set(0);
        this.loading.set(false);
        return;
      }
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.search().trim(); if (s) params = params.set('search', s);
      const startDate = this.startDate(); if (startDate) params = params.set('date_from', startDate);
      const endDate = this.endDate(); if (endDate) params = params.set('date_to', endDate);
      this.api.getRepairs(params).subscribe({
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

    if (tab === 'repair-reasons') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.search().trim(); if (s) params = params.set('search', s);
      const rrs = this.repairReasonStatus(); params = params.set('status', rrs);
      this.api.getRepairReasons(params).subscribe({
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

    if (tab === 'dead-imei') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.search().trim(); if (s) params = params.set('search', s);
      const wid = this.selectedWarehouseId(); if (wid != null) params = params.set('warehouse_id', String(wid));
      this.api.getDeadIMEIHistory(params).subscribe({
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

    if (tab === 'analytics') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.search().trim(); if (s) params = params.set('search', s);
      const sb = this.sortBy(); if (sb) params = params.set('sort_by', sb);
      const sd = this.sortDir(); if (sd) params = params.set('sort_dir', sd);
      const wid = this.selectedWarehouseId(); if (wid != null) params = params.set('warehouse_id', String(wid));
      if (this.groupByBatch()) params = params.set('group_by_batch', 'true');

      // Date range parameters
      if (this.isCustomPeriod()) {
        const asd = this.analyticsStartDate(); if (asd) params = params.set('start_date', asd);
        const aed = this.analyticsEndDate(); if (aed) params = params.set('end_date', aed);
      } else {
        const pd = this.periodDays(); if (pd !== 30) params = params.set('period_days', String(pd));
      }

      this.api.getSkuUsageAnalytics(params).subscribe({
        next: (res) => {
          if (seq !== this.requestSeq) return;
          this.data.set(res.data?.items ?? []);
          this.total.set(res.data?.total ?? 0);
          this.loading.set(false);
        },
        error: () => { if (seq !== this.requestSeq) return; this.loading.set(false); },
      });
      return;
    }
  }

  // Handlers from GenericPage
  onPageChange(event: { pageIndex: number; pageSize: number }) {
    const idx = event.pageIndex;
    const size = event.pageSize;
    let changed = false;
    if (idx !== this.pageIndex()) { this.pageIndex.set(idx); changed = true; }
    if (size !== this.pageSize()) { this.pageSize.set(size); changed = true; }
    if (!changed) return;
  }

  onFiltersChange(event: { search: string; facets: Record<string, string> }) {
    this.search.set(event.search ?? '');
    const f = event.facets ?? {};
    const parseNum = (v?: string) => { if (!v) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

    if (this.activeTab() === 'repairs') {
      this.startDate.set(f['start_date'] || null);
      this.endDate.set(f['end_date'] || null);
    }

    if (this.activeTab() === 'repair-reasons') {
      const rrs = f['status']; this.repairReasonStatus.set(rrs === 'false' ? 'false' : 'true');
    }

    if (this.activeTab() === 'dead-imei') {
      this.selectedWarehouseId.set(parseNum(f['warehouse_id']));
    }

    if (this.activeTab() === 'analytics') {
      this.selectedWarehouseId.set(parseNum(f['warehouse_id']));
      this.groupByBatch.set(f['group_by_batch'] === 'true');

      // Handle period selection
      const period = f['period_days'];
      if (period === 'custom') {
        // Keep current period but use custom dates
        this.analyticsStartDate.set(f['analytics_start_date'] || null);
        this.analyticsEndDate.set(f['analytics_end_date'] || null);
      } else if (period) {
        const periodDays = parseNum(period);
        if (periodDays) {
          this.periodDays.set(this.normalizePeriodDays(periodDays));
          this.analyticsStartDate.set(null);
          this.analyticsEndDate.set(null);
        }
      }
    }

    this.pageIndex.set(0); // reset
  }

  onSortingChange(state: Array<{ id: string; desc: boolean }>) {
    // Only handle sorting for analytics tab
    if (this.activeTab() !== 'analytics') return;

    if (state.length === 0) {
      this.sortBy.set(null);
      this.sortDir.set(null);
    } else {
      const firstSort = state[0];
      this.sortBy.set(firstSort.id);
      this.sortDir.set(firstSort.desc ? 'desc' : 'asc');
    }
    this.pageIndex.set(0); // reset to first page
  }

  onTabChange(key: string | null) {
    const k = (key ?? 'repairs') as 'repairs' | 'repair-reasons' | 'dead-imei' | 'analytics';
    if (k !== this.activeTab()) {
      this.activeTab.set(k);
      // reset filters per tab
      this.search.set('');
      this.startDate.set(null);
      this.endDate.set(null);
      this.selectedWarehouseId.set(null);
      this.repairReasonStatus.set('true');
      this.groupByBatch.set(false);
      this.sortBy.set(null);
      this.sortDir.set(null);
      this.pageIndex.set(0);

      // Reset analytics-specific fields
      if (k === 'analytics') {
        this.periodDays.set(30);
        this.analyticsStartDate.set(null);
        this.analyticsEndDate.set(null);
        this.groupByBatch.set(false);
      }
    }
  }

  // Actions
  onHeaderActionClick(actionKey: string) {
    if (actionKey === 'create-repair') {
      this.router.navigate(['/repair/repairs/add']);
    } else if (actionKey === 'export-csv') {
      this.exportRepairs();
    } else if (actionKey === 'add-repair-reason') {
      this.router.navigate(['/repair/repair-reasons/add']);
    } else if (actionKey === 'add-dead-imei') {
      this.router.navigate(['/repair/dead-imei/add']);
    } else if (actionKey === 'view-analytics') {
      this.router.navigate(['/repair/analytics']);
    }
  }

  onCellAction(event: { action: string; row: RepairRow }) {
    const tab = this.activeTab();
    const row = event.row as any;

    if (tab === 'repairs' && event.action === 'detail') {
      this.router.navigate(['/repair/repairs', row.id]);
      return;
    }

    if (tab === 'repairs' && event.action === 'delete') {
      this.deleteRepair(row);
      return;
    }

    if (tab === 'repair-reasons' && event.action === 'edit') {
      this.router.navigate(['/repair/repair-reasons', row.id, 'edit']);
      return;
    }

    if (tab === 'repair-reasons' && event.action === 'toggle-status') {
      this.toggleRepairReasonStatus(row);
      return;
    }

    if (tab === 'dead-imei' && event.action === 'detail') {
      // Add detail view for dead IMEI if needed
      return;
    }

    if (tab === 'analytics' && event.action === 'detail') {
      // Analytics rows don't have detail views currently
      return;
    }
  }

  deleteRepair(repair: RepairRecord) {
    this.deleteContext.set(repair);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.deleteContext.set(null);
  }

  onDeleteModalAction(action: string): void {
    if (action === 'delete') {
      this.confirmDelete();
    } else if (action === 'cancel') {
      this.closeDeleteModal();
    }
  }

  confirmDelete() {
    const repair = this.deleteContext();
    if (!repair) return;

    this.loading.set(true);
    this.api.deleteRepair(repair.id).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.status === 200) {
          this.closeDeleteModal();
          this.fetchData(); // Refresh the list
          this.toast.success('Repair deleted successfully and stock restored', 'Delete Successful');
        } else {
          this.toast.error(res.message || 'Failed to delete repair', 'Delete Failed');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err.error?.message || 'Failed to delete repair', 'Delete Failed');
      },
    });
  }

  toggleRepairReasonStatus(reason: RepairReasonRecord) {
    const newStatus = !reason.status;
    const actionText = newStatus ? 'enable' : 'disable';

    this.loading.set(true);
    this.api.updateRepairReason(reason.id, { status: newStatus }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.status === 200) {
          this.fetchData(); // Refresh the list
          this.toast.success(
            `Repair reason ${newStatus ? 'enabled' : 'disabled'} successfully`,
            'Status Updated'
          );
        } else {
          this.toast.error(res.message || `Failed to ${actionText} repair reason`, 'Update Failed');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(
          err.error?.message || `Failed to ${actionText} repair reason`,
          'Update Failed'
        );
      },
    });
  }

  // Export state
  isExporting = signal(false);

  // Export functionality for repairs tab
  exportRepairs() {
    if (this.activeTab() !== 'repairs') return;

    this.isExporting.set(true);

    // Build the same parameters used for fetching data
    let params = new HttpParams();
    const s = this.search().trim();
    if (s) params = params.set('search', s);
    const startDate = this.startDate();
    if (startDate) params = params.set('date_from', startDate);
    const endDate = this.endDate();
    if (endDate) params = params.set('date_to', endDate);

    // Call the export endpoint
    this.api.exportRepairs(params).subscribe({
      next: (blob: Blob) => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Generate filename with timestamp and filters
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        let filename = `repairs_${timestamp}`;

        // Add filter info to filename if any filters are applied
        const filterParts: string[] = [];
        if (s) filterParts.push(`search-${s.replace(/[^a-zA-Z0-9]/g, '_')}`);
        if (startDate) filterParts.push(`from-${startDate}`);
        if (endDate) filterParts.push(`to-${endDate}`);

        if (filterParts.length > 0) {
          filename += `_${filterParts.join('_')}`;
        }

        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.isExporting.set(false);
        this.toast.success('CSV export completed successfully', 'Export Successful');
      },
      error: (error: any) => {
        console.error('Export failed:', error);
        this.isExporting.set(false);
        this.toast.error('Failed to export repairs to CSV', 'Export Failed');
      }
    });
  }
}

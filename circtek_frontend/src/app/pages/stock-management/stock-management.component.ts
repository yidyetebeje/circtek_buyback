import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColumnDef } from '@tanstack/angular-table';
import { HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { GenericPageComponent, type Facet, type GenericTab } from '../../shared/components/generic-page/generic-page.component';
import { ApiService } from '../../core/services/api.service';
import { PaginationService } from '../../shared/services/pagination.service';
import { StockWithWarehouse } from '../../core/models/stock';
import { PurchaseRecord } from '../../core/models/purchase';
import { TransferWithDetails } from '../../core/models/transfer';
import { SkuSpecsRecord } from '../../core/models/sku-specs';
import { SkuUsageAnalyticsItem } from '../../core/models/analytics';

// Union type for table rows across tabs
export type StockMgmtRow = StockWithWarehouse | PurchaseRecord | TransferWithDetails | SkuSpecsRecord | SkuUsageAnalyticsItem;

@Component({
  selector: 'app-stock-management',
  imports: [CommonModule, GenericPageComponent],
  templateUrl: './stock-management.component.html',
  styleUrls: ['./stock-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockManagementComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paginationService = inject(PaginationService);

  // State
  loading = signal(false);
  data = signal<StockMgmtRow[]>([]);
  total = signal(0);

  // Tabs & pagination
  activeTab = signal<'stock' | 'purchases' | 'transfers' | 'sku-specs' | 'analytics'>('stock');
  pageIndex = signal(0);
  pageSize = signal(10);

  // Filters (shared + per tab)
  search = signal('');
  selectedWarehouseId = signal<number | null>(null); // stock, transfers
  selectedIsPart = signal<'any' | 'true' | 'false'>('any'); // stock
  lowStockThreshold = signal<number | null>(null); // stock

  // Sorting (server-side)
  sortBy = signal<string | null>(null);
  sortDir = signal<'asc' | 'desc' | null>(null);

  fromWarehouseId = signal<number | null>(null); // transfers
  toWarehouseId = signal<number | null>(null); // transfers
  transferStatus = signal<'any' | 'pending' | 'completed'>('any'); // transfers
  
  // Analytics filters
  periodDays = signal<number>(30); // analytics
  startDate = signal<string | null>(null); // analytics
  endDate = signal<string | null>(null); // analytics

  // Options
  warehouseOptions = signal<Array<{ label: string; value: string }>>([]);

  // Guards
  private initialized = signal(false);
  private requestSeq = 0;
  // Track last emitted URL query to avoid redundant navigations
  private _lastQueryNorm = signal<string>('');

  // Tabs
  tabs = computed<GenericTab[]>(() => [
    { key: 'stock', label: 'Stock' },
    { key: 'purchases', label: 'Purchases' },
    { key: 'transfers', label: 'Transfers' },
    { key: 'sku-specs', label: 'SKU Specs' },
    { key: 'analytics', label: 'Usage Analytics' },
  ]);

  // Header
  title = 'Stock Management';
  subtitle = 'Manage stock, purchases, transfers and SKU specifications';
  primaryAction = computed(() => {
    const tab = this.activeTab();
    if (tab === 'purchases') {
      return { label: 'Add Purchase' };
    } else if (tab === 'transfers') {
      return { label: 'Add Transfer' };
    } else if (tab === 'sku-specs') {
      return { label: 'Add SKU Specs' };
    }
    return null;
  });

  // Check if custom date range is selected
  isCustomDateRange = computed(() => {
    const tab = this.activeTab();
    if (tab === 'analytics') {
      const hasCustomDates = this.startDate() || this.endDate();
      // Show custom date inputs if either date is set
      return hasCustomDates;
    }
    return false;
  });

  // Get the current period value for the dropdown
  currentPeriodValue = computed(() => {
    if (this.activeTab() === 'analytics') {
      if (this.isCustomDateRange()) {
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
    if (tab === 'stock') {
      list.push({ key: 'warehouse_id', label: 'Warehouse', type: 'select', options: this.warehouseOptions() });
      list.push({ key: 'is_part', label: 'Type', type: 'select', options: [
        { label: 'Any', value: 'any' },
        { label: 'Part', value: 'true' },
        { label: 'Device', value: 'false' },
      ] });
      list.push({ key: 'low_stock_threshold', label: 'Low stock ≤', type: 'text', placeholder: 'e.g., 5' });
    }
    if (tab === 'transfers') {
      list.push({ key: 'from_warehouse_id', label: 'From Warehouse', type: 'select', options: this.warehouseOptions() });
      list.push({ key: 'to_warehouse_id', label: 'To Warehouse', type: 'select', options: this.warehouseOptions() });
      list.push({ key: 'status', label: 'Status', type: 'select', options: [
        { label: 'Any', value: 'any' },
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
      ] });
    }
    if (tab === 'analytics') {
      list.push({ key: 'warehouse_id', label: 'Warehouse', type: 'select', options: this.warehouseOptions() });
      list.push({ key: 'period_days', label: 'Period', type: 'select', options: [
        { label: 'Last 7 days', value: '7' },
        { label: 'Last 30 days', value: '30' },
        { label: 'Last 60 days', value: '60' },
        { label: 'Last 90 days', value: '90' },
        { label: 'Custom Range', value: 'custom' }
      ] });
      // Only show date fields when custom range is selected
      if (this.isCustomDateRange()) {
        list.push({ key: 'start_date', label: 'Start Date', type: 'text', placeholder: 'YYYY-MM-DD' });
        list.push({ key: 'end_date', label: 'End Date', type: 'text', placeholder: 'YYYY-MM-DD' });
      }
    }
    // purchases: keep only search for now
    return list;
  });

  // Columns per tab
  columns = computed<ColumnDef<StockMgmtRow>[]>(() => {
    switch (this.activeTab()) {
      case 'stock':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'SKU', accessorKey: 'sku' as any },
          { header: 'Warehouse', accessorKey: 'warehouse_name' as any },
          { header: 'Quantity', accessorKey: 'quantity' as any },
          { header: 'Type', id: 'is_part', accessorFn: (r: any) => (r.is_part ? 'Part' : 'Device') },
        ];
      case 'purchases':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'PO No.', accessorKey: 'purchase_order_no' as any, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          { header: 'Supplier', accessorKey: 'supplier_name' as any, meta: { truncateText: true, truncateMaxWidth: '180px' } },
          { header: 'Expected', id: 'expected_delivery_date', accessorFn: (r: any) => {
            if (!r.expected_delivery_date) return '-';
            const date = new Date(r.expected_delivery_date);
            return date.toLocaleDateString('en-US', { 
              year: 'numeric',
              month: 'long', 
              day: 'numeric'
            });
          } },
          {
            header: 'Actions', id: 'actions' as any, enableSorting: false as any,
            meta: {
              actions: [
                { key: 'detail', label: 'Detail', class: 'text-info', icon: 'eye' },
                { key: 'receive', label: 'Receive Items', class: 'text-secondary', icon: 'package-plus' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      case 'transfers':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'From', accessorKey: 'from_warehouse_name' as any },
          { header: 'To', accessorKey: 'to_warehouse_name' as any },
          { header: 'Items', accessorKey: 'total_items' as any },
          { header: 'Quantity', accessorKey: 'total_quantity' as any },
          { header: 'Completed', id: 'is_completed', accessorFn: (r: any) => (r.is_completed ? 'Yes' : 'No') },
          {
            header: 'Actions', id: 'actions' as any, enableSorting: false as any,
            meta: {
              actions: [
                { key: 'edit', label: 'Edit', class: 'text-primary' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      case 'sku-specs':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'SKU', accessorKey: 'sku' as any, meta: { truncateText: true, truncateMaxWidth: '120px' } },
          { header: 'Make', accessorKey: 'make' as any, meta: { truncateText: true, truncateMaxWidth: '100px' } },
          { header: 'Model No.', accessorKey: 'model_no' as any, meta: { truncateText: true, truncateMaxWidth: '120px' } },
          { header: 'Model Name', accessorKey: 'model_name' as any, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          { header: 'Device Type', accessorKey: 'device_type' as any, meta: { truncateText: true, truncateMaxWidth: '120px' } },
          { header: 'Storage', accessorKey: 'storage' as any },
          { header: 'Memory', accessorKey: 'memory' as any },
          { header: 'Color', accessorKey: 'color' as any },
          {
            header: 'Actions', id: 'actions' as any, enableSorting: false as any,
            meta: {
              actions: [
                { key: 'edit', label: 'Edit', class: 'text-primary' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      case 'analytics':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'Warehouse', accessorKey: 'warehouse_name' as any },
          { header: 'Part SKU', accessorKey: 'part_sku' as any, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          { header: 'Qty Used', accessorKey: 'quantity_used' as any },
          { header: 'Current Stock', accessorKey: 'current_stock' as any },
          { header: 'Usage/Day', accessorFn: (r: any) => r.usage_per_day?.toFixed(2) || '0' },
          { header: 'Days Until Empty', id: 'expected_days_until_empty', accessorFn: (r: any) => {
            const days = r.expected_days_until_empty;
            if (days === null || days === undefined) return '∞';
            if (days <= 0) return 'Out of Stock';
            if (days <= 30) return `${days} days (⚠️)`;
            return `${days} days`;
          } },
          { header: 'Period', id: 'period_info', accessorFn: (r: any) => `${r.period_days} days` },
        ];
      default:
        return [];
    }
  });

  // Search placeholder per tab
  searchPlaceholder = computed(() => {
    switch (this.activeTab()) {
      case 'stock': return 'Search SKU';
      case 'purchases': return 'Search PO, supplier, tracking';
      case 'transfers': return 'Search transfers';
      case 'sku-specs': return 'Search SKU, make, model';
      case 'analytics': return 'Search part SKU';
      default: return 'Search';
    }
  });

  constructor() {
    // Hydrate from URL
    const qp = this.route.snapshot.queryParamMap;
    const num = (k: string, d: number) => { const v = qp.get(k); const n = Number(v); return Number.isFinite(n) ? n : d; };
    const optNum = (k: string) => { const v = qp.get(k); if (v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
    const str = (k: string, d = '') => qp.get(k) ?? d;

    const tab = str('tab', 'stock');
    if (tab === 'stock' || tab === 'purchases' || tab === 'transfers' || tab === 'sku-specs' || tab === 'analytics') this.activeTab.set(tab as any);
    else this.activeTab.set('stock');

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

    this.selectedWarehouseId.set(optNum('warehouse_id'));
    const ip = str('is_part', 'any'); this.selectedIsPart.set(ip === 'true' || ip === 'false' ? (ip as any) : 'any');
    this.lowStockThreshold.set(optNum('low_stock_threshold'));

    this.fromWarehouseId.set(optNum('from_warehouse_id'));
    this.toWarehouseId.set(optNum('to_warehouse_id'));
    const ts = str('status', 'any'); this.transferStatus.set(ts === 'pending' || ts === 'completed' ? (ts as any) : 'any');
    
    // Analytics parameters
    const urlPeriodParam = qp.get('period_days');
    if (urlPeriodParam === 'custom') {
      // Keep default period but load custom dates
      this.periodDays.set(30);
    } else {
      const urlPeriodDays = num('period_days', 30);
      this.periodDays.set(this.normalizePeriodDays(urlPeriodDays));
    }
    this.startDate.set(qp.get('start_date'));
    this.endDate.set(qp.get('end_date'));
    

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
        const opts = (res.data ?? []).map(w => ({ label: w.name, value: String(w.id) }));
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
      // sorting
      this.sortBy();
      this.sortDir();
      // stock
      this.selectedWarehouseId();
      this.selectedIsPart();
      this.lowStockThreshold();
      // transfers
      this.fromWarehouseId();
      this.toWarehouseId();
      this.transferStatus();
      // analytics
      this.periodDays();
      this.startDate();
      this.endDate();
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
      const sb = this.sortBy();
      const sd = this.sortDir();
      if (sb) query['sort_by'] = sb;
      if (sd) query['sort_dir'] = sd;
      if (this.activeTab() === 'stock') {
        const wid = this.selectedWarehouseId(); if (wid != null) query['warehouse_id'] = String(wid);
        if (this.selectedIsPart() !== 'any') query['is_part'] = this.selectedIsPart();
        const lst = this.lowStockThreshold(); if (lst != null) query['low_stock_threshold'] = String(lst);
      }
      if (this.activeTab() === 'transfers') {
        const fw = this.fromWarehouseId(); if (fw != null) query['from_warehouse_id'] = String(fw);
        const tw = this.toWarehouseId(); if (tw != null) query['to_warehouse_id'] = String(tw);
        if (this.transferStatus() !== 'any') query['status'] = this.transferStatus();
      }
      if (this.activeTab() === 'analytics') {
        const wid = this.selectedWarehouseId(); if (wid != null) query['warehouse_id'] = String(wid);
        const sd = this.startDate();
        const ed = this.endDate();
        
        // If custom dates are being used, set period to 'custom'
        if (sd || ed) {
          query['period_days'] = 'custom';
          if (sd) query['start_date'] = sd;
          if (ed) query['end_date'] = ed;
        } else {
          // Use predefined period
          const pd = this.periodDays();
          if (pd > 0 && pd <= 365 && pd !== 30) {
            query['period_days'] = String(pd);
          }
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

  private fetchData() {
    const seq = ++this.requestSeq;
    this.loading.set(true);
    const tab = this.activeTab();

    if (tab === 'stock') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.search().trim(); if (s) params = params.set('search', s);
      const sb = this.sortBy(); const sd = this.sortDir();
      if (sb) params = params.set('sort_by', sb);
      if (sd) params = params.set('sort_dir', sd);
      const wid = this.selectedWarehouseId(); if (wid != null) params = params.set('warehouse_id', String(wid));
      const ip = this.selectedIsPart(); if (ip !== 'any') params = params.set('is_part', ip === 'true' ? 'true' : 'false');
      const lst = this.lowStockThreshold(); if (lst != null) params = params.set('low_stock_threshold', String(lst));
      this.api.getStock(params).subscribe({
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

    if (tab === 'purchases') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.search().trim(); if (s) params = params.set('search', s);
      const sb = this.sortBy(); const sd = this.sortDir();
      if (sb) params = params.set('sort_by', sb);
      if (sd) params = params.set('sort_dir', sd);
      this.api.getPurchases(params).subscribe({
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

    if (tab === 'transfers') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.search().trim(); if (s) params = params.set('search', s);
      const sb = this.sortBy(); const sd = this.sortDir();
      if (sb) params = params.set('sort_by', sb);
      if (sd) params = params.set('sort_dir', sd);
      const fw = this.fromWarehouseId(); if (fw != null) params = params.set('from_warehouse_id', String(fw));
      const tw = this.toWarehouseId(); if (tw != null) params = params.set('to_warehouse_id', String(tw));
      const st = this.transferStatus(); if (st !== 'any') params = params.set('status', st);
      this.api.getTransfers(params).subscribe({
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
      const sb = this.sortBy(); const sd = this.sortDir();
      if (sb) params = params.set('sort_by', sb);
      if (sd) params = params.set('sort_dir', sd);
      const wid = this.selectedWarehouseId(); if (wid != null) params = params.set('warehouse_id', String(wid));
      const pd = this.periodDays();
      // Only send period_days if it's valid and different from default
      if (pd > 0 && pd <= 365 && pd !== 30) {
        params = params.set('period_days', String(pd));
      }
      const startDate = this.startDate(); if (startDate) params = params.set('start_date', startDate);
      const endDate = this.endDate(); if (endDate) params = params.set('end_date', endDate);
      
      // Debug: Log the parameters being sent
      console.log('Analytics API call parameters:', {
        page: this.pageIndex() + 1,
        limit: this.pageSize(),
        search: this.search(),
        warehouse_id: this.selectedWarehouseId(),
        period_days: this.periodDays(),
        start_date: this.startDate(),
        end_date: this.endDate(),
        params_string: params.toString()
      });
      
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

    // sku-specs
    let params = new HttpParams()
      .set('page', String(this.pageIndex() + 1))
      .set('limit', String(this.pageSize()));
    const s = this.search().trim(); if (s) params = params.set('search', s);
    const sb = this.sortBy(); const sd = this.sortDir();
    if (sb) params = params.set('sort_by', sb);
    if (sd) params = params.set('sort_dir', sd);
    this.api.getSkuSpecs(params).subscribe({
      next: (res) => {
        if (seq !== this.requestSeq) return;
        this.data.set(res.data ?? []);
        this.total.set(res.meta?.total ?? 0);
        this.loading.set(false);
      },
      error: () => { if (seq !== this.requestSeq) return; this.loading.set(false); },
    });
  }

  // Helper method to normalize period days
  private normalizePeriodDays(value: number | null | undefined): number {
    if (value == null || value <= 0 || value > 365) {
      return 30; // default
    }
    return value;
  }

  // Handlers from GenericPage
  onPageChange(event: { pageIndex: number; pageSize: number }) {
    const idx = event.pageIndex;
    const size = event.pageSize;
    let changed = false;
    if (idx !== this.pageIndex()) { this.pageIndex.set(idx); changed = true; }
    if (size !== this.pageSize()) { 
      this.pageSize.set(size); 
      // Persist the page size preference
      this.paginationService.setPageSize(size);
      changed = true; 
    }
    if (!changed) return;
  }

  onFiltersChange(event: { search: string; facets: Record<string, string> }) {
    this.search.set(event.search ?? '');
    const f = event.facets ?? {};
    const parseNum = (v?: string) => { if (!v) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

    if (this.activeTab() === 'stock') {
      this.selectedWarehouseId.set(parseNum(f['warehouse_id']));
      const ip = f['is_part']; this.selectedIsPart.set(ip === 'true' || ip === 'false' ? (ip as any) : 'any');
      this.lowStockThreshold.set(parseNum(f['low_stock_threshold']));
    }

    if (this.activeTab() === 'transfers') {
      this.fromWarehouseId.set(parseNum(f['from_warehouse_id']));
      this.toWarehouseId.set(parseNum(f['to_warehouse_id']));
      const ts = f['status']; this.transferStatus.set(ts === 'pending' || ts === 'completed' ? (ts as any) : 'any');
    }

    if (this.activeTab() === 'analytics') {
      this.selectedWarehouseId.set(parseNum(f['warehouse_id']));
      
      // Handle period dropdown
      const periodValue = f['period_days'];
      if (periodValue === 'custom') {
        // When custom is selected, don't change period_days but allow date range
        // Keep current periodDays value or set to a reasonable default
        if (!this.startDate() && !this.endDate()) {
          // If no custom dates exist, keep current period
        }
      } else if (periodValue) {
        const pd = parseNum(periodValue);
        if (pd) {
          this.periodDays.set(this.normalizePeriodDays(pd));
          // Clear custom dates when using predefined periods
          this.startDate.set(null);
          this.endDate.set(null);
        }
      }
      
      this.startDate.set(f['start_date'] || null);
      this.endDate.set(f['end_date'] || null);
    }
    

    this.pageIndex.set(0); // reset
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
    // Reset to first page on sort change
    this.pageIndex.set(0);
  }

  onTabChange(key: string | null) {
    const k = (key ?? 'stock') as 'stock' | 'purchases' | 'transfers' | 'sku-specs' | 'analytics';
    if (k !== this.activeTab()) {
      this.activeTab.set(k);
      // reset filters per tab
      this.search.set('');
      this.pageIndex.set(0);
      // reset sorting when tab changes
      this.sortBy.set(null);
      this.sortDir.set(null);
    }
  }

  // Actions
  onPrimaryActionClick() {
    const tab = this.activeTab();
    if (tab === 'purchases') {
      this.router.navigate(['/stock-management/purchases/add']);
    } else if (tab === 'transfers') {
      this.router.navigate(['/stock-management/transfers/add']);
    } else if (tab === 'sku-specs') {
      this.router.navigate(['/stock-management/sku-specs/add']);
    }
  }

  onCellAction(event: { action: string; row: StockMgmtRow }) {
    const tab = this.activeTab();
    const row = event.row as any;


    if (tab === 'purchases' && event.action === 'detail') {
      this.router.navigate(['/stock-management/purchases', row.id]);
      return;
    }

    if (tab === 'purchases' && event.action === 'receive') {
      this.router.navigate(['/stock-management/purchases/receive'], {
        queryParams: { purchaseId: row.id }
      });
      return;
    }

    if (tab === 'transfers' && event.action === 'edit') {
      this.router.navigate(['/stock-management/transfers', row.id, 'complete']);
      return;
    }

    if (tab === 'sku-specs' && event.action === 'edit') {
      this.router.navigate(['/stock-management/sku-specs', row.id, 'edit']);
      return;
    }

    // edit actions/forms will be added later
  }

}

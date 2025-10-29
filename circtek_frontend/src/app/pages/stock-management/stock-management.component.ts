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
// Union type for table rows across tabs
export type StockMgmtRow = StockWithWarehouse | PurchaseRecord | TransferWithDetails | SkuSpecsRecord;

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
  activeTab = signal<'stock' | 'purchases' | 'transfers' | 'sku-specs' | 'stock-in'>('stock');
  pageIndex = signal(0);
  pageSize = signal(10);

  // Filters (shared + per tab)
  search = signal('');
  selectedWarehouseId = signal<number | null>(null); // stock, transfers
  selectedIsPart = signal<'any' | 'true' | 'false'>('any'); // stock
  lowStockThreshold = signal<number | null>(null); // stock
  groupByBatch = signal<boolean>(false); // stock

  // Sorting (server-side)
  sortBy = signal<string | null>(null);
  sortDir = signal<'asc' | 'desc' | null>(null);

  fromWarehouseId = signal<number | null>(null); // transfers
  toWarehouseId = signal<number | null>(null); // transfers
  transferStatus = signal<'any' | 'pending' | 'completed'>('any'); // transfers

  // Options
  warehouseOptions = signal<Array<{ label: string; value: string }>>([]);
  adjustModalOpen = signal(false);
  submitting = signal(false);
  adjustSku = signal<string>('');
  adjustWarehouseId = signal<number | null>(null);
  adjustWarehouseName = computed(() => {
    const id = this.adjustWarehouseId();
    if (id == null) return '';
    const opt = this.warehouseOptions().find(o => Number(o.value) === id);
    return opt?.label ?? String(id);
  });
  adjustAvailableQty = signal<number>(0);
  adjustQty = signal<number>(0);
  adjustReason = signal<'inventory_loss' | 'manual_correction' | 'damage' | 'theft' | 'expired' | 'return_to_supplier'>('manual_correction');
  adjustNotes = signal<string>('');
  adjustError = signal<string>('');

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
  ]);

  // Header
  title = 'Stock Management';
  subtitle = 'Manage stock, purchases, transfers and SKU specifications';
  primaryAction = computed(() => {
    const tab = this.activeTab();
    if (tab === 'stock') {
      return { label: 'Stock In' };
    } else if (tab === 'purchases') {
      return { label: 'Add Purchase' };
    } else if (tab === 'transfers') {
      return { label: 'Add Transfer' };
    } else if (tab === 'sku-specs') {
      return { label: 'Add SKU Specs' };
    }
    return null;
  });

  closeAdjustModal() {
    this.adjustModalOpen.set(false);
  }

  submitAdjustment() {
    if (this.submitting()) return;
    const sku = this.adjustSku();
    const wid = this.adjustWarehouseId();
    const qty = this.adjustQty();
    const availableQty = this.adjustAvailableQty();
    if (!sku || wid == null || qty <= 0 || qty > availableQty) return;
    this.submitting.set(true);
    this.adjustError.set('');
    this.api.createStockAdjustment({
      sku,
      warehouse_id: wid,
      quantity_adjustment: -qty,
      reason: this.adjustReason(),
      notes: this.adjustNotes() || undefined,
      actor_id: 1,
    }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res && res.status >= 200 && res.status < 300) {
          this.adjustModalOpen.set(false);
          this.fetchData();
        } else {
          this.adjustError.set(res?.message || 'Failed to create adjustment');
        }
      },
      error: () => {
        this.submitting.set(false);
        this.adjustError.set('Failed to create adjustment');
      }
    });
  }

  onAdjustQtyInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    // valueAsNumber can be NaN when empty
    const val = input.valueAsNumber;
    this.adjustQty.set(Number.isFinite(val) ? val : 0);
  }

  onAdjustReasonChange(event: Event) {
    const select = event.target as HTMLSelectElement | null;
    if (!select) return;
    this.adjustReason.set(select.value as any);
  }

  onAdjustNotesInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement | null;
    if (!textarea) return;
    this.adjustNotes.set(textarea.value);
  }

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
      list.push({ key: 'low_stock_threshold', label: 'Low stock ≤', type: 'text', placeholder: 'e.g., 5', inputType: 'number' });
      list.push({ key: 'group_by_batch', label: 'Group by Batch', type: 'select', options: [
        { label: 'No (Show individual SKUs)', value: 'false' },
        { label: 'Yes (Group by base SKU)', value: 'true' }
      ] });
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
          {
            header: 'Actions', id: 'actions' as any, enableSorting: false as any,
            meta: {
              actions: [
                { key: 'adjust', label: 'Adjust', class: 'text-primary' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      case 'purchases':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'Supplier Order No.', accessorKey: 'supplier_order_no' as any, meta: { truncateText: true, truncateMaxWidth: '150px' } },
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
      default:
        return [];
    }
  });

  // Search placeholder per tab
  searchPlaceholder = computed(() => {
    switch (this.activeTab()) {
      case 'stock': return 'SKU';
      case 'purchases': return 'Supplier order,supplier,tracking';
      case 'transfers': return 'transfers';
      case 'sku-specs': return 'SKU,make,model';
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
    if (tab === 'stock' || tab === 'purchases' || tab === 'transfers' || tab === 'sku-specs' || tab === 'stock-in') this.activeTab.set(tab as any);
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
    this.groupByBatch.set(str('group_by_batch') === 'true');

    this.fromWarehouseId.set(optNum('from_warehouse_id'));
    this.toWarehouseId.set(optNum('to_warehouse_id'));
    const ts = str('status', 'any'); this.transferStatus.set(ts === 'pending' || ts === 'completed' ? (ts as any) : 'any');
    

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
      this.groupByBatch();
      // transfers
      this.fromWarehouseId();
      this.toWarehouseId();
      this.transferStatus();
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
        if (this.groupByBatch()) query['group_by_batch'] = 'true';
      }
      if (this.activeTab() === 'transfers') {
        const fw = this.fromWarehouseId(); if (fw != null) query['from_warehouse_id'] = String(fw);
        const tw = this.toWarehouseId(); if (tw != null) query['to_warehouse_id'] = String(tw);
        if (this.transferStatus() !== 'any') query['status'] = this.transferStatus();
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
      if (this.groupByBatch()) params = params.set('group_by_batch', 'true');
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
    const parsePositiveNum = (v?: string) => { if (!v) return null; const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };

    if (this.activeTab() === 'stock') {
      this.selectedWarehouseId.set(parseNum(f['warehouse_id']));
      const ip = f['is_part']; this.selectedIsPart.set(ip === 'true' || ip === 'false' ? (ip as any) : 'any');
      this.lowStockThreshold.set(parsePositiveNum(f['low_stock_threshold']));
      this.groupByBatch.set(f['group_by_batch'] === 'true');
    }

    if (this.activeTab() === 'transfers') {
      this.fromWarehouseId.set(parseNum(f['from_warehouse_id']));
      this.toWarehouseId.set(parseNum(f['to_warehouse_id']));
      const ts = f['status']; this.transferStatus.set(ts === 'pending' || ts === 'completed' ? (ts as any) : 'any');
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
    const k = (key ?? 'stock') as 'stock' | 'purchases' | 'transfers' | 'sku-specs' | 'stock-in';
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
    if (tab === 'stock') {
      this.router.navigate(['/stock-in']);
    } else if (tab === 'purchases') {
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

    if (tab === 'stock' && event.action === 'adjust') {
      const r = row as StockWithWarehouse;
      this.adjustSku.set(r.sku);
      this.adjustWarehouseId.set(r.warehouse_id);
      this.adjustAvailableQty.set(r.quantity);
      this.adjustQty.set(0);
      this.adjustReason.set('manual_correction');
      this.adjustNotes.set('');
      this.adjustError.set('');
      this.adjustModalOpen.set(true);
      return;
    }

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

import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColumnDef } from '@tanstack/angular-table';
import { HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { GenericPageComponent, type Facet, type GenericTab } from '../../shared/components/generic-page/generic-page.component';
import { ApiService } from '../../core/services/api.service';
import { StockWithWarehouse } from '../../core/models/stock';
import { PurchaseRecord } from '../../core/models/purchase';
import { TransferWithDetails } from '../../core/models/transfer';

// Union type for table rows across tabs
export type StockMgmtRow = StockWithWarehouse | PurchaseRecord | TransferWithDetails;

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

  // State
  loading = signal(false);
  data = signal<StockMgmtRow[]>([]);
  total = signal(0);

  // Tabs & pagination
  activeTab = signal<'stock' | 'purchases' | 'transfers'>('stock');
  pageIndex = signal(0);
  pageSize = signal(10);

  // Filters (shared + per tab)
  search = signal('');
  selectedWarehouseId = signal<number | null>(null); // stock, transfers
  selectedIsPart = signal<'any' | 'true' | 'false'>('any'); // stock
  lowStockThreshold = signal<number | null>(null); // stock

  fromWarehouseId = signal<number | null>(null); // transfers
  toWarehouseId = signal<number | null>(null); // transfers
  transferStatus = signal<'any' | 'pending' | 'completed'>('any'); // transfers

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
  ]);

  // Header
  title = 'Stock Management';
  subtitle = 'Manage stock, purchases and transfers';
  primaryAction = computed(() => {
    const tab = this.activeTab();
    if (tab === 'purchases') {
      return { label: 'Add Purchase' };
    } else if (tab === 'transfers') {
      return { label: 'Add Transfer' };
    }
    return null;
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
    // purchases: keep only search for now
    return list;
  });

  // Columns per tab
  columns = computed<ColumnDef<StockMgmtRow>[]>(() => {
    switch (this.activeTab()) {
      case 'stock':
        return [
          { header: 'ID', accessorKey: 'id' as any },
          { header: 'SKU', accessorKey: 'sku' as any },
          { header: 'Warehouse', accessorKey: 'warehouse_name' as any },
          { header: 'Quantity', accessorKey: 'quantity' as any },
          { header: 'Type', id: 'is_part', accessorFn: (r: any) => (r.is_part ? 'Part' : 'Device') },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No') },
          {
            header: 'Actions', id: 'actions' as any, enableSorting: false as any,
            meta: {
              actions: [
                { key: 'edit', label: 'Edit', class: 'text-primary' },
                { key: 'delete', label: 'Delete', class: 'text-error' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      case 'purchases':
        return [
          { header: 'ID', accessorKey: 'id' as any },
          { header: 'PO No.', accessorKey: 'purchase_order_no' as any },
          { header: 'Supplier', accessorKey: 'supplier_name' as any },
          { header: 'Expected', accessorKey: 'expected_delivery_date' as any },
          { header: 'Status', id: 'status', accessorFn: (r: any) => (r.status ? 'Active' : 'Inactive') },
          {
            header: 'Actions', id: 'actions' as any, enableSorting: false as any,
            meta: {
              actions: [
                { key: 'receive', label: 'Receive Items', class: 'text-secondary' },
                { key: 'edit', label: 'Edit', class: 'text-primary' },
                { key: 'delete', label: 'Delete', class: 'text-error' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      case 'transfers':
      default:
        return [
          { header: 'ID', accessorKey: 'id' as any },
          { header: 'From', accessorKey: 'from_warehouse_name' as any },
          { header: 'To', accessorKey: 'to_warehouse_name' as any },
          { header: 'Items', accessorKey: 'total_items' as any },
          { header: 'Quantity', accessorKey: 'total_quantity' as any },
          { header: 'Completed', id: 'is_completed', accessorFn: (r: any) => (r.is_completed ? 'Yes' : 'No') },
          {
            header: 'Actions', id: 'actions' as any, enableSorting: false as any,
            meta: {
              actions: [
                { key: 'complete', label: 'Complete', class: 'text-secondary' },
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
      case 'stock': return 'Search SKU';
      case 'purchases': return 'Search PO, supplier, tracking';
      default: return 'Search transfers';
    }
  });

  constructor() {
    // Hydrate from URL
    const qp = this.route.snapshot.queryParamMap;
    const num = (k: string, d: number) => { const v = qp.get(k); const n = Number(v); return Number.isFinite(n) ? n : d; };
    const optNum = (k: string) => { const v = qp.get(k); if (v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
    const str = (k: string, d = '') => qp.get(k) ?? d;

    const tab = str('tab', 'stock');
    if (tab === 'stock' || tab === 'purchases' || tab === 'transfers') this.activeTab.set(tab as any);
    else this.activeTab.set('stock');

    this.pageIndex.set(Math.max(0, num('page', 1) - 1));
    this.pageSize.set(num('limit', 10));
    this.search.set(str('search', ''));

    this.selectedWarehouseId.set(optNum('warehouse_id'));
    const ip = str('is_part', 'any'); this.selectedIsPart.set(ip === 'true' || ip === 'false' ? (ip as any) : 'any');
    this.lowStockThreshold.set(optNum('low_stock_threshold'));

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
      // stock
      this.selectedWarehouseId();
      this.selectedIsPart();
      this.lowStockThreshold();
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

    // transfers
    let params = new HttpParams()
      .set('page', String(this.pageIndex() + 1))
      .set('limit', String(this.pageSize()));
    const s = this.search().trim(); if (s) params = params.set('search', s);
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

    this.pageIndex.set(0); // reset
  }

  onSortingChange(_state: Array<{ id: string; desc: boolean }>) {
    // Server-side sorting not implemented
  }

  onTabChange(key: string | null) {
    const k = (key ?? 'stock') as 'stock' | 'purchases' | 'transfers';
    if (k !== this.activeTab()) {
      this.activeTab.set(k);
      // reset filters per tab
      this.search.set('');
      this.pageIndex.set(0);
    }
  }

  // Actions
  onPrimaryActionClick() {
    const tab = this.activeTab();
    if (tab === 'purchases') {
      this.router.navigate(['/stock-management/purchases/add']);
    } else if (tab === 'transfers') {
      this.router.navigate(['/stock-management/transfers/add']);
    }
  }

  onCellAction(event: { action: string; row: StockMgmtRow }) {
    const tab = this.activeTab();
    const row = event.row as any;

    if (event.action === 'delete') {
      this.openDeleteModal(tab, row);
      return;
    }

    if (tab === 'purchases' && event.action === 'receive') {
      this.router.navigate(['/stock-management/purchases', row.id, 'receive']);
      return;
    }

    if (tab === 'transfers' && event.action === 'complete') {
      this.router.navigate(['/stock-management/transfers', row.id, 'complete']);
      return;
    }

    // edit actions/forms will be added later
  }

  // Delete confirmation modal state
  isDeleteModalOpen = signal(false);
  deleteContext = signal<{ tab: 'stock' | 'purchases' | 'transfers'; row: StockMgmtRow } | null>(null);

  openDeleteModal(tab: 'stock' | 'purchases' | 'transfers', row: StockMgmtRow) {
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

    let obs: any;
    if (ctx.tab === 'stock') obs = this.api.deleteStock((ctx.row as any).id);
    else if (ctx.tab === 'purchases') obs = this.api.deletePurchase((ctx.row as any).id);
    else obs = this.api.deleteTransfer((ctx.row as any).id);

    obs.subscribe({
      next: () => { this.loading.set(false); this.closeDeleteModal(); this.fetchData(); },
      error: () => { this.loading.set(false); this.closeDeleteModal(); },
    });
  }
}

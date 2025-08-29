import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CellHostDirective } from './directives/cell-host.directive';
import { FormsModule } from '@angular/forms';
import { ColumnDef, createAngularTable, getCoreRowModel, SortingState } from '@tanstack/angular-table';
import { LucideAngularModule, Edit, Trash2, UserPlus, Users } from 'lucide-angular';

// Reusable Generic Page composed with Tailwind + DaisyUI
// - Header title
// - Optional tabs
// - Filters area (search + facets)
// - TanStack Table (sorting, pagination)
// - Pagination controls

export type GenericTab = { key: string; label: string; badge?: number };

export type TextFacet = {
  key: string;
  label: string;
  type: 'text';
  placeholder?: string;
};

export type SelectFacet = {
  key: string;
  label: string;
  type: 'select';
  options: Array<{ label: string; value: string }>;
};

export type Facet = TextFacet | SelectFacet;

export type CellAction = {
  key: string;
  label: string;
  icon?: string;
  class?: string;
};

@Component({
  selector: 'app-generic-page',
  imports: [CommonModule, FormsModule, CellHostDirective, LucideAngularModule],
  templateUrl: './generic-page.component.html',
  styleUrl: './generic-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericPageComponent<TData extends object> {
  // Expose Math for template usage
  protected readonly Math = Math;
  // Header
  title = input.required<string>();
  subtitle = input<string | null>(null);
  primaryAction = input<{ label: string; icon?: string } | null>(null);
  primaryActionClick = output<void>();

  // Loading state
  loading = input<boolean>(false);


  // Tabs (optional)
  tabs = input<GenericTab[] | null>(null);
  activeTabKey = signal<string | null>(null);
  // Optional external control of active tab (e.g., from URL)
  activeTabKeyInput = input<string | null>(null);
  tabChange = output<string | null>();

  // Filters
  searchPlaceholder = input<string>('Search…');
  searchQuery = signal<string>('');
  facets = input<Facet[] | null>(null);
  facetModel = signal<Record<string, string>>({});
  filtersChange = output<{ search: string; facets: Record<string, string> }>();

  // Table
  columns = input.required<ColumnDef<TData, any>[]>();
  data = input.required<TData[]>();

  // Sorting
  sorting = signal<SortingState>([]);
  sortingChange = output<SortingState>();

  // Pagination
  pageIndex = signal(0);
  pageSize = signal(10);
  // Optional external pagination inputs to hydrate/sync
  pageIndexInput = input<number | null>(null);
  pageSizeInput = input<number | null>(null);
  total = input<number | null>(null); // if null uses data().length
  pageChange = output<{ pageIndex: number; pageSize: number }>();
  cellAction = output<{ action: string; row: TData }>();

  // Table instance
  private _paginationInitialized = false;
  private _skipNextPaginationEmit = false;

  table = computed(() =>
    createAngularTable<TData>(() => ({
      data: this.data(),
      columns: this.columns(),
      // Keep state in sync with our signals
      state: {
        sorting: this.sorting(),
        pagination: { pageIndex: this.pageIndex(), pageSize: this.pageSize() },
      },
      getCoreRowModel: getCoreRowModel(),
      // Use manual pagination: server provides paginated data, and we pass pageCount below
      manualPagination: true,
      pageCount: Math.max(1, Math.ceil((this.total() ?? this.data().length) / Math.max(1, this.pageSize()))),
      onSortingChange: (updater: any) => {
        const next = typeof updater === 'function' ? updater(this.sorting()) : updater;
        this.sorting.set(next);
        this.sortingChange.emit(this.sorting());
      },
      onPaginationChange: (updater: any) => {
        const current = { pageIndex: this.pageIndex(), pageSize: this.pageSize() };
        const next = typeof updater === 'function' ? updater(current) : updater;
        // Ignore the very first pagination callback from TanStack and controlled updates
        if (!this._paginationInitialized || this._skipNextPaginationEmit) {
          this._paginationInitialized = true;
          this._skipNextPaginationEmit = false;
          this.pageIndex.set(next.pageIndex ?? 0);
          this.pageSize.set(next.pageSize ?? 10);
          return;
        }
        this.pageIndex.set(next.pageIndex ?? 0);
        this.pageSize.set(next.pageSize ?? 10);
        this.pageChange.emit({ pageIndex: this.pageIndex(), pageSize: this.pageSize() });
      },
      debugAll: false,
    }))
  );

  // Emit filters when search/facets change
  private _filtersInitialized = false;
  private _filtersEffect = effect(() => {
    // read signals to subscribe
    const search = this.searchQuery();
    const facets = this.facetModel();
    // Skip the very first run to avoid resetting page via initial mount
    if (!this._filtersInitialized) {
      this._filtersInitialized = true;
      return;
    }
    // Reset pagination to first page on any filter change
    this.pageIndex.set(0);
    try {
      this.table().setPageIndex(0);
    } catch {}
    this.filtersChange.emit({ search, facets });
  });

  // Sync external pagination inputs into internal state without emitting pageChange
  private _syncPaginationInputs = effect(() => {
    const extIndex = this.pageIndexInput();
    const extSize = this.pageSizeInput();
    let changed = false;
    if (extIndex != null && extIndex !== this.pageIndex()) {
      this.pageIndex.set(extIndex);
      changed = true;
    }
    if (extSize != null && extSize !== this.pageSize()) {
      this.pageSize.set(extSize);
      changed = true;
    }
    if (changed) {
      this._skipNextPaginationEmit = true;
      try {
        this.table().setPageIndex(this.pageIndex());
        this.table().setPageSize(this.pageSize());
      } catch {}
    }
  });


  // Tabs initialization
  private _tabsInit = effect(() => {
    const t = this.tabs();
    if (t && t.length && !this.activeTabKey()) {
      this.activeTabKey.set(t[0].key);
    }
  });

  // Sync external active tab into internal state without emitting tabChange
  private _syncActiveTabInput = effect(() => {
    const ext = this.activeTabKeyInput();
    const current = this.activeTabKey();
    if (ext != null && ext !== current) {
      this.activeTabKey.set(ext);
    }
  });

  setActiveTab(key: string) {
    this.activeTabKey.set(key);
    this.tabChange.emit(key);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.facetModel.set({});
  }

  // Helpers for template
  onSearchInput(value: string) {
    this.searchQuery.set(value);
  }

  facetValue(key: string): string {
    return this.facetModel()[key] ?? '';
  }

  updateFacet(key: string, value: string) {
    const next = { ...this.facetModel() };
    next[key] = value;
    this.facetModel.set(next);
  }

  facetPlaceholder(f: Facet): string {
    return (f as TextFacet).placeholder ?? '';
  }

  isSelectFacet(f: Facet): f is SelectFacet {
    return f.type === 'select';
  }

  // Header/cell helpers to avoid TS syntax in templates
  headerLabel(header: any): string {
    return (header?.column?.columnDef?.header as string) ?? header?.column?.id ?? '';
  }

  cellText(cell: any): string {
    const v = cell?.getValue?.();
    const s = v == null ? '' : String(v);
    return s.trim().length ? s : 'N/A';
  }

  getCellActions(cell: any): CellAction[] | undefined {
    return cell.column.columnDef.meta?.actions;
  }

  onCellAction(action: string, row: any) {
    // Support both TanStack Row objects and plain row data
    const data = row && typeof row === 'object' && 'original' in row ? (row as any).original : row;
    this.cellAction.emit({ action, row: data as TData });
  }

  getCellClass(cell: any): string {
    const cellClassFn = cell.column.columnDef.meta?.cellClass;
    if (typeof cellClassFn === 'function') {
      return cellClassFn(cell.row.original as TData);
    }
    return '';
  }

  getCellComponent(cell: any): any | undefined {
    return cell.column.columnDef.meta?.cellComponent;
  }

  getCellComponentData(cell: any): any {
    const cellComponentDataFn = cell.column.columnDef.meta?.cellComponentData;
    if (typeof cellComponentDataFn === 'function') {
      // Pass both the row and the cell for richer context (row index, column id, etc.)
      // Existing callbacks that only accept one arg will ignore the 2nd.
      return cellComponentDataFn(cell.row.original as TData, cell);
    }
    return cell.row.original;
  }

  // Icons for actions
  private readonly ACTION_ICONS: Record<string, any> = {
    edit: Edit,
    delete: Trash2,
    assign: UserPlus,
    'view-assigned': Users,
  };

  getActionIcon(a: CellAction): any {
    const key = (a.icon ?? a.key) || '';
    return this.ACTION_ICONS[key] ?? Edit;
  }

  // Pagination helpers for template
  totalPages = computed(() => Math.max(1, Math.ceil((this.total() ?? this.data().length) / Math.max(1, this.pageSize()))));
  currentPage = computed(() => this.pageIndex() + 1);
  canPrev = computed(() => this.pageIndex() > 0);
  canNext = computed(() => this.currentPage() < this.totalPages());

  // Pagination actions
  prevPage() {
    if (!this.canPrev()) return;
    try {
      this.table().previousPage();
    } catch {}
  }

  nextPage() {
    if (!this.canNext()) return;
    try {
      this.table().nextPage();
    } catch {}
  }

  updatePageSize(size: number) {
    const n = Number(size) || 10;
    try {
      this.table().setPageSize(n);
      this.table().setPageIndex(0);
    } catch {}
  }
}

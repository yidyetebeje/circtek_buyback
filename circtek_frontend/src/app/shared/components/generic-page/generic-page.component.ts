import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CellHostDirective } from './directives/cell-host.directive';
import { FormsModule } from '@angular/forms';
import { ColumnDef, createAngularTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, SortingState } from '@tanstack/angular-table';

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
  imports: [CommonModule, FormsModule, CellHostDirective],
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

  // Pagination
  pageIndex = signal(0);
  pageSize = signal(10);
  total = input<number | null>(null); // if null uses data().length
  pageChange = output<{ pageIndex: number; pageSize: number }>();
  cellAction = output<{ action: string; row: TData }>();

  // Table instance
  table = computed(() =>
    createAngularTable<TData>(() => ({
      data: this.data(),
      columns: this.columns(),
      state: { sorting: this.sorting() },
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      onSortingChange: (updater: any) => {
        const next = typeof updater === 'function' ? updater(this.sorting()) : updater;
        this.sorting.set(next);
      },
      initialState: {
        pagination: { pageIndex: this.pageIndex(), pageSize: this.pageSize() },
      },
      onPaginationChange: (updater: any) => {
        const current = { pageIndex: this.pageIndex(), pageSize: this.pageSize() };
        const next = typeof updater === 'function' ? updater(current) : updater;
        this.pageIndex.set(next.pageIndex ?? 0);
        this.pageSize.set(next.pageSize ?? 10);
        this.pageChange.emit({ pageIndex: this.pageIndex(), pageSize: this.pageSize() });
      },
      debugAll: false,
    }))
  );

  // Emit filters when search/facets change
  private _filtersEffect = effect(() => {
    // read signals to subscribe
    const search = this.searchQuery();
    const facets = this.facetModel();
    this.filtersChange.emit({ search, facets });
  });


  // Tabs initialization
  private _tabsInit = effect(() => {
    const t = this.tabs();
    if (t && t.length && !this.activeTabKey()) {
      this.activeTabKey.set(t[0].key);
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
    return v == null ? '' : String(v);
  }

  getCellActions(cell: any): CellAction[] | undefined {
    return cell.column.columnDef.meta?.actions;
  }

  onCellAction(action: string, row: any) {
    this.cellAction.emit({ action, row: row.original as TData });
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
      return cellComponentDataFn(cell.row.original as TData);
    }
    return cell.row.original;
  }
}

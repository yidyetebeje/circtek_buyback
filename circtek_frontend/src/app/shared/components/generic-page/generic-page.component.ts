import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, inject, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CellHostDirective } from './directives/cell-host.directive';
import { FormsModule } from '@angular/forms';
import { ColumnDef, createAngularTable, getCoreRowModel, SortingState } from '@tanstack/angular-table';
import { LucideAngularModule, Edit, Trash2, UserPlus, Users, Eye, PackagePlus } from 'lucide-angular';
import { TruncatedTextComponent } from '../truncated-text/truncated-text.component';

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
  inputType?: 'text' | 'date' | 'datetime-local' | 'time' | 'email' | 'number';
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
  imports: [CommonModule, FormsModule, CellHostDirective, LucideAngularModule, TruncatedTextComponent],
  templateUrl: './generic-page.component.html',
  styleUrl: './generic-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericPageComponent<TData extends object> implements AfterViewInit, OnDestroy {
  // Expose Math for template usage
  protected readonly Math = Math;

  // ViewChild reference to search input for focus management
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  // Scroll event listener to remove focus from search input
  private scrollListener?: () => void;
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
  private _skipPaginationEmits = 0;

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
        const nextIndex = next.pageIndex ?? 0;
        const nextSize = next.pageSize || 10;
        const isSame = nextIndex === current.pageIndex && nextSize === current.pageSize;
        // Ignore the very first pagination callback and a controlled number of emits
        if (!this._paginationInitialized || this._skipPaginationEmits > 0 || isSame) {
          this._paginationInitialized = true;
          if (this._skipPaginationEmits > 0) this._skipPaginationEmits--;
          if (!isSame) {
            this.pageIndex.set(nextIndex);
            this.pageSize.set(nextSize);
          }
          return;
        }
        this.pageIndex.set(nextIndex);
        this.pageSize.set(nextSize);
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
    this.filtersChange.emit({ search, facets });
  });

  // Sync external pagination inputs into internal state without emitting pageChange
  private _syncPaginationInputs = effect(() => {
    const extIndex = this.pageIndexInput();
    const extSize = this.pageSizeInput();
    if (extIndex != null && extIndex !== this.pageIndex()) {
      this.pageIndex.set(extIndex);
    }
    if (extSize != null && extSize !== this.pageSize()) {
      this.pageSize.set(extSize > 0 ? extSize : 10);
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

  clearSearch() {
    this.searchQuery.set('');
  }

  facetValue(key: string): string {
    return this.facetModel()[key] ?? '';
  }

  updateFacet(key: string, value: string) {
    const next = { ...this.facetModel() };
    
    // Find the facet definition to check its input type
    const facet = this.facets()?.find(f => f.key === key);
    const inputType = facet?.type === 'text' ? (facet as TextFacet).inputType : undefined;
    
    // For number inputs, validate that the value is not negative
    if (inputType === 'number' && value) {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue < 0) {
        // Reject negative values - don't update the facet
        return;
      }
    }
    
    next[key] = value;
    // If updating a start_date, ensure paired end_date is not before or equal to it
    if (key.endsWith('start_date')) {
      const endKey = key.replace('start_date', 'end_date');
      const endVal = next[endKey];
      // Values are expected as YYYY-MM-DD; lexical compare works
      if (endVal && value && endVal <= value) {
        next[endKey] = '';
      }
    }
    this.facetModel.set(next);
  }

  facetPlaceholder(f: Facet): string {
    return (f as TextFacet).placeholder ?? '';
  }

  facetInputType(f: Facet): string {
    return (f as TextFacet).inputType ?? 'text';
  }

  isSelectFacet(f: Facet): f is SelectFacet {
    return f.type === 'select';
  }

  handleNumberKeydown(event: KeyboardEvent) {
    // Prevent minus sign, plus sign, and 'e' (exponential notation) for number inputs
    if (event.key === '-' || event.key === '+' || event.key === 'e' || event.key === 'E') {
      event.preventDefault();
    }
  }

  // Date helpers for template
  datePlusDays(dateStr: string, days: number): string {
    if (!dateStr) return '';
    // dateStr expected in YYYY-MM-DD
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  minDateForFacet(f: Facet): string | null {
    // Only apply to text facets with date input type
    if (f.type !== 'text') return null;
    const inputType = (f as TextFacet).inputType ?? 'text';
    if (inputType !== 'date') return null;
    const key = f.key;
    if (!key.endsWith('end_date')) return null;
    const startKey = key.replace('end_date', 'start_date');
    const startVal = this.facetModel()[startKey];
    if (!startVal) return null;
    // Enforce that End Date must be AFTER Start Date (min = start + 1 day)
    return this.datePlusDays(startVal, 1);
  }

  minValueForFacet(f: Facet): string | null {
    // Only apply to text facets
    if (f.type !== 'text') return null;
    const inputType = (f as TextFacet).inputType ?? 'text';
    
    // For date inputs, use the existing date logic
    if (inputType === 'date') {
      return this.minDateForFacet(f);
    }
    
    // For number inputs, enforce minimum of 0
    if (inputType === 'number') {
      return '0';
    }
    
    return null;
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

  // Check if cell should use truncated text
  shouldTruncateText(cell: any): boolean {
    return cell.column.columnDef.meta?.truncateText === true;
  }

  // Check if cell should render as color
  shouldRenderColor(cell: any): boolean {
    return cell.column.columnDef.meta?.renderColor === true;
  }

  // Get truncation settings for cell
  getTruncationSettings(cell: any): { maxWidth?: string } {
    const meta = cell.column.columnDef.meta;
    return {
      maxWidth: meta?.truncateMaxWidth || '200px'
    };
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
    eye: Eye,
    'package-plus': PackagePlus,
    detail: Eye,
    receive: PackagePlus,
    'trash-2': Trash2,
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
    // Update internal signals first
    this.pageIndex.set(0);
    this.pageSize.set(n);
    // Then emit the pageChange event immediately
    this.pageChange.emit({ pageIndex: 0, pageSize: n });
    // Also update the table state for consistency
    try {
      this.table().setPageSize(n);
      this.table().setPageIndex(0);
    } catch {
      // If table update fails, we've already emitted the event above
    }
  }

  ngAfterViewInit(): void {
    // Set up scroll event listener to blur search input when scrolling
    this.scrollListener = () => {
      if (this.searchInput?.nativeElement === document.activeElement) {
        this.searchInput.nativeElement.blur();
      }
    };

    // Add scroll listener to window and the main container
    window.addEventListener('scroll', this.scrollListener, { passive: true });
    // Also listen for scroll events on any scrollable containers
    document.addEventListener('scroll', this.scrollListener, { passive: true, capture: true });
  }

  ngOnDestroy(): void {
    // Clean up scroll event listeners
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      document.removeEventListener('scroll', this.scrollListener, { capture: true });
    }
  }
}

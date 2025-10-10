import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericPageComponent, type Facet, type GenericTab } from '../../shared/components/generic-page/generic-page.component';
import { GenericModalComponent, type ModalAction } from '../../shared/components/generic-modal/generic-modal.component';
import { TruncatedTextComponent } from '../../shared/components/truncated-text/truncated-text.component';
import { ColumnDef } from '@tanstack/angular-table';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PaginationService } from '../../shared/services/pagination.service';
import { HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { DiagnosticQuestion, DiagnosticQuestionSet, DiagnosticQuestionSetAssignment } from '../../core/models/diagnostic-question';
import { Tenant } from '../../core/models/tenant';
import { User } from '../../core/models/user';
import { ToastrService } from 'ngx-toastr';
import { ToastService } from '../../core/services/toast.service';

export type DiagnosticMgmtRow = DiagnosticQuestion | DiagnosticQuestionSet | DiagnosticQuestionSetAssignment;

@Component({
  selector: 'app-diagnostic-questions',
  imports: [CommonModule, GenericPageComponent, GenericModalComponent, TruncatedTextComponent],
  templateUrl: './diagnostic-questions.component.html',
  styleUrls: ['./diagnostic-questions.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticQuestionsComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly toast = inject(ToastService);
  private readonly paginationService = inject(PaginationService);

  // Loading & data
  loading = signal(false);
  data = signal<DiagnosticMgmtRow[]>([]);
  total = signal(0);

  // Tab & pagination
  activeTab = signal<'question-sets'>('question-sets');
  pageIndex = signal(0);
  pageSize = signal(10);

  // Filters
  search = signal('');
  private debouncedSearch = signal('');
  private searchTimeout: any = null;
  selectedTenantId = signal<number | null>(null);

  // Options
  tenantOptions = signal<Array<{ label: string; value: string }>>([]);
  testerOptions = signal<Array<{ label: string; value: string }>>([]);

  // Guards
  private initialized = signal(false);
  private requestSeq = 0;

  isSuperAdmin = computed(() => this.auth.currentUser()?.role_id === 1);

  // Tabs
  tabs = computed<GenericTab[]>(() => [
    { key: 'question-sets', label: 'Question Sets' },
  ]);

  // Header primary action per tab
  primaryAction = computed(() => {
    return { label: 'Add Question Set' } as { label: string };
  });

  // Facets
  facets = computed<Facet[]>(() => {
    const list: Facet[] = [];
    if (this.isSuperAdmin()) {
      list.unshift({ key: 'tenant_id', label: 'Tenant', type: 'select', options: this.tenantOptions() });
    }
    return list;
  });

  // Delete confirmation modal state
  isDeleteModalOpen = signal(false);
  deleteContext = signal<{ tab: 'question-sets'; row: DiagnosticMgmtRow } | null>(null);

  // Assignment modal state
  isAssignModalOpen = signal(false);
  selectedQuestionSetId = signal<number | null>(null);
  selectedTesterId = signal<number | null>(null);

  deleteModalActions = computed<ModalAction[]>(() => [
    { label: 'Cancel', variant: 'ghost', action: 'cancel' },
    { label: 'Delete', variant: 'error', action: 'delete' }
  ]);

  assignModalActions = computed<ModalAction[]>(() => [
    { label: 'Cancel', variant: 'ghost', action: 'cancel' },
    {
      label: 'Assign',
      variant: 'accent',
      disabled: !this.selectedQuestionSetId() || !this.selectedTesterId(),
      action: 'assign'
    }
  ]);

  openDeleteModal(row: DiagnosticMgmtRow) {
    this.deleteContext.set({ tab: 'question-sets', row });
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
    const ctx = this.deleteContext();
    if (!ctx) return;

    this.loading.set(true);
    this.api.deleteDiagnosticQuestionSet((ctx.row as any).id).subscribe({
      next: () => {
        this.loading.set(false);
        this.closeDeleteModal();
        this.fetchData();
        this.toast.deleteSuccess('Question Set');
      },
      error: (error: any) => {
        console.error('Failed to delete:', error);
        this.loading.set(false);
        this.closeDeleteModal();
        const errorMessage = error?.error?.message || error?.message;
        if (errorMessage) {
          this.toastr.error(errorMessage, 'Delete Question Set Failed');
        } else {
          this.toast.deleteError('Question Set');
        }
      }
    });
  }

  openAssignModalWithQuestionSet(questionSetId: number) {
    this.selectedQuestionSetId.set(questionSetId);
    this.selectedTesterId.set(null);
    this.isAssignModalOpen.set(true);
  }

  closeAssignModal() {
    this.isAssignModalOpen.set(false);
    this.selectedQuestionSetId.set(null);
    this.selectedTesterId.set(null);
  }

  onAssignModalAction(action: string): void {
    if (action === 'assign') {
      this.confirmAssign();
    } else if (action === 'cancel') {
      this.closeAssignModal();
    }
  }

  confirmAssign() {
    const questionSetId = this.selectedQuestionSetId();
    const testerId = this.selectedTesterId();
    if (!questionSetId || !testerId) return;

    this.loading.set(true);
    this.api.assignDiagnosticQuestionSet({ question_set_id: questionSetId, tester_id: testerId }).subscribe({
      next: () => {
        this.loading.set(false);
        this.closeAssignModal();
        this.fetchData();
        this.toast.success('Question set assigned to tester successfully');
      },
      error: (error: any) => {
        console.error('Failed to assign:', error);
        this.loading.set(false);
        const errorMessage = error?.error?.message || error?.message || 'Failed to assign question set';
        this.toastr.error(errorMessage, 'Assignment Failed');
      }
    });
  }

  getSelectedQuestionSetTitle(): string {
    const questionSetId = this.selectedQuestionSetId();
    if (!questionSetId) return '';
    const questionSet = this.data().find(d => (d as any).id === questionSetId);
    return questionSet ? (questionSet as any).title : '';
  }

  onTesterSelect(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedTesterId.set(value ? Number(value) : null);
  }

  // Columns vary by tab
  columns = computed<ColumnDef<DiagnosticMgmtRow>[]>(() => {
    switch (this.activeTab()) {
      case 'question-sets':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'Title', accessorKey: 'title' as any, meta: { truncateText: true, truncateMaxWidth: '200px' } },
          { header: 'Description', accessorKey: 'description' as any, meta: { truncateText: true, truncateMaxWidth: '250px' } },
          { header: 'Tenant', accessorKey: 'tenant_name' as any, meta: { truncateText: true, truncateMaxWidth: '120px' } },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No'), enableSorting: false },
          {
            header: 'Actions',
            id: 'actions' as any,
            enableSorting: false as any,
            meta: {
              actions: [
                { key: 'assign', label: 'Assign', class: 'text-accent' },
                { key: 'edit', label: 'Edit', class: 'text-primary' },
                { key: 'delete', label: 'Delete', class: 'text-error' },
              ],
              cellClass: () => 'text-right'
            }
          } as ColumnDef<DiagnosticMgmtRow>,
        ];
      default:
        return [] as ColumnDef<DiagnosticMgmtRow>[];
    }
  });
  searchPlaceholder = computed(() => {
    return 'Search question sets';
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

    const tab = str('tab', 'question-sets');
    if (tab === 'question-sets') {
      this.activeTab.set(tab as any);
    }

    // Initialize pagination
    this.pageIndex.set(Math.max(0, num('page', 1) - 1));
    const urlPageSize = num('limit', 0);
    const preferredPageSize = this.paginationService.getPageSizeWithFallback(urlPageSize > 0 ? urlPageSize : null);
    this.pageSize.set(preferredPageSize);

    this.search.set(str('search', ''));
    this.selectedTenantId.set(optNum('tenant_id'));

    this.initialized.set(true);

    // Load options
    effect(() => {
      if (!this.isSuperAdmin()) { this.tenantOptions.set([]); return; }
      this.api.getTenants(new HttpParams().set('limit', '1000')).subscribe(res => {
        const opts = (res.data ?? []).map(t => ({ label: t.name, value: String(t.id) }));
        this.tenantOptions.set(opts);
      });
    });

    effect(() => {
      // Load testers (role_id 3 typically)
      this.api.getUsers(new HttpParams().set('limit', '1000').set('role_id', '3')).subscribe(res => {
        const opts = (res.data ?? []).map(u => ({ label: `${u.name} (${u.user_name})`, value: String(u.id) }));
        this.testerOptions.set(opts);
      });
    });


    // Debounce search input
    effect(() => {
      const searchValue = this.search();
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.searchTimeout = setTimeout(() => {
        this.debouncedSearch.set(searchValue);
      }, 500);
    });

    // Fetch data when state changes
    effect(() => {
      if (!this.initialized()) return;
      this.activeTab();
      this.pageIndex();
      this.pageSize();
      this.debouncedSearch();
      this.selectedTenantId();
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
      const s = this.debouncedSearch().trim(); if (s) query['search'] = s;
      if (this.isSuperAdmin()) {
        const tid = this.selectedTenantId(); if (tid != null) query['tenant_id'] = String(tid);
      }
      this.router.navigate([], { queryParams: query, replaceUrl: true });
    });
  }

  private fetchData() {
    const seq = ++this.requestSeq;
    this.loading.set(true);

    const tab = this.activeTab();
    let params = new HttpParams()
      .set('page', String(this.pageIndex() + 1))
      .set('limit', String(this.pageSize()));
    const s = this.debouncedSearch().trim(); if (s) params = params.set('search', s);
    if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }

    this.api.getDiagnosticQuestionSets(params).subscribe({
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
      this.paginationService.setPageSize(size);
      changed = true;
    }
    if (!changed) return;
  }

  onFiltersChange(event: { search: string; facets: Record<string, string> }) {
    this.search.set(event.search ?? '');
    const f = event.facets ?? {};
    const parseNum = (v?: string) => {
      if (!v) return null; const n = Number(v); return Number.isFinite(n) ? n : null;
    };
    if (this.isSuperAdmin()) this.selectedTenantId.set(parseNum(f['tenant_id']));
    this.pageIndex.set(0);
  }

  onSortingChange(state: Array<{ id: string; desc: boolean }>) {
    this.pageIndex.set(0);
  }

  onTabChange(key: string | null) {
    const k = (key ?? 'question-sets') as 'question-sets';
    this.activeTab.set(k);
    this.pageIndex.set(0);
    this.search.set('');
  }

  onPrimaryActionClick() {
    this.router.navigate(['/diagnostic-questions/new']);
  }

  onCellAction(event: { action: string; row: DiagnosticMgmtRow }) {
    const { action, row } = event;
    const tab = this.activeTab();

    if (action === 'edit') {
      if (tab === 'question-sets') {
        this.router.navigate(['/diagnostic-questions', (row as any).id, 'edit']);
      }
    } else if (action === 'assign') {
      if (tab === 'question-sets') {
        this.openAssignModalWithQuestionSet((row as any).id);
      }
    } else if (action === 'delete') {
      this.openDeleteModal(row);
    }
  }
}

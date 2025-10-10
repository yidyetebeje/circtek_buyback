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
import { User } from '../../core/models/user';
import { Warehouse } from '../../core/models/warehouse';
import { WiFiProfile } from '../../core/models/wifi-profile';
import { Tenant } from '../../core/models/tenant';
import { RepairReasonRecord } from '../../core/models/repair-reason';
import { LabelTemplateRecord } from '../../core/models/label-template';
import { WorkflowRecord } from '../../core/models/workflow';
import { Grade } from '../../core/models/grade';
import { OtaUpdate } from '../../core/models/ota-update';
import { ApiKey } from '../../core/models/api-key';
import { DiagnosticQuestionSet } from '../../core/models/diagnostic-question';
import { ToastrService } from 'ngx-toastr';
import { ToastService } from '../../core/services/toast.service';

// Union to drive the generic table
export type MgmtRow = User | Warehouse | WiFiProfile | Tenant | RepairReasonRecord | LabelTemplateRecord | WorkflowRecord | Grade | OtaUpdate | ApiKey | DiagnosticQuestionSet;

@Component({
  selector: 'app-management',
  imports: [CommonModule, GenericPageComponent, GenericModalComponent, TruncatedTextComponent],
  templateUrl: './management.component.html',
  styleUrls: ['./management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagementComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly toast = inject(ToastService);
  private readonly paginationService = inject(PaginationService);

  // Loading & data
  loading = signal(false);
  data = signal<MgmtRow[]>([]);
  total = signal(0);

  // Tab & pagination
  activeTab = signal<'tenants' | 'tenant-profile' | 'users' | 'warehouses' | 'wifi' | 'labels' | 'workflows' | 'grades' | 'ota-updates' | 'api-keys' | 'questions'>('users');
  pageIndex = signal(0);
  pageSize = signal(10);

  // Filters
  search = signal('');
  private debouncedSearch = signal('');
  private searchTimeout: any = null;
  selectedRoleId = signal<number | null>(null); // users
  selectedTenantId = signal<number | null>(null); // super_admin only
  selectedUserActive = signal<'any' | 'true' | 'false'>('any'); // users
  selectedApiKeyActive = signal<'' | 'true' | 'false'>(''); // api-keys

  // Sorting
  sortField = signal<string | null>(null);
  sortOrder = signal<'asc' | 'desc'>('asc');

  // Options
  roleOptions = signal<Array<{ label: string; value: string }>>([]);
  tenantOptions = signal<Array<{ label: string; value: string }>>([]);
  testerOptions = signal<Array<{ label: string; value: string }>>([]);
  wifiOptions = signal<Array<{ label: string; value: string }>>([]);

  // Current tenant data for normal users
  currentTenant = signal<Tenant | null>(null);

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
      { key: 'labels', label: 'Label Templates' },
      { key: 'workflows', label: 'Workflows' },
      { key: 'grades', label: 'Grades' },
      { key: 'questions', label: 'questions' },
      { key: 'ota-updates', label: 'OTA Updates' },
    ];
    // Show Tenants and API Keys first for super_admin, Tenant Profile first for normal users
    if (this.isSuperAdmin()) {
      return [
        { key: 'tenants', label: 'Tenants' },
        { key: 'api-keys', label: 'API Keys' },
        ...base
      ];
    } else {
      return [{ key: 'tenant-profile', label: 'Tenant Profile' }, ...base];
    }
  });

  // Header primary action per tab
  primaryAction = computed(() => {
    const t = this.activeTab();
    const label = t === 'tenants'
      ? 'Add Tenant'
      : t === 'tenant-profile'
        ? 'Edit Tenant Info'
        : t === 'users'
          ? 'Add User'
          : t === 'warehouses'
            ? 'Add Warehouse'
            : t === 'labels'
              ? 'Add Label Template'
              : t === 'workflows'
                ? 'Add Workflow'
                : t === 'grades'
                  ? 'Add Grade'
                  : t === 'questions'
                    ? 'Add Question Set'
                    : t === 'ota-updates'
                      ? 'Add OTA Update'
                      : t === 'api-keys'
                        ? 'Create API Key'
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

    // Tenant facet is irrelevant when viewing tenants, tenant-profile, or ota-updates tabs
    if (this.isSuperAdmin() && this.activeTab() !== 'tenants' && this.activeTab() !== 'tenant-profile' && this.activeTab() !== 'ota-updates' && this.activeTab() !== 'questions') {
      list.unshift({ key: 'tenant_id', label: 'Tenant', type: 'select', options: this.tenantOptions() });
    }

    // Tenant facet for questionss (applied via backend filter)
    if (this.activeTab() === 'questions' && this.isSuperAdmin()) {
      list.unshift({ key: 'tenant_id', label: 'Tenant', type: 'select', options: this.tenantOptions() });
    }

    // Add status filter for API keys
    if (this.activeTab() === 'api-keys') {
      list.push({ 
        key: 'is_active', 
        label: 'Status', 
        type: 'select', 
        options: [
          { label: 'All', value: '' },
          { label: 'Active', value: 'true' },
          { label: 'Inactive', value: 'false' },
        ] 
      });
    }

    return list;
  });

  // Delete confirmation modal state
  isDeleteModalOpen = signal(false);
  deleteContext = signal<{ tab: 'tenants' | 'tenant-profile' | 'users' | 'warehouses' | 'wifi' | 'labels' | 'workflows' | 'grades' | 'ota-updates' | 'api-keys' | 'questions'; row: MgmtRow } | null>(null);

  // questions Set Assignment Modal state
  isDiagnosticAssignModalOpen = signal(false);
  selectedDiagnosticQuestionSet = signal<DiagnosticQuestionSet | null>(null);
  selectedDiagnosticTesterId = signal<number | null>(null);

  diagnosticAssignModalActions = computed<ModalAction[]>(() => [
    { label: 'Cancel', variant: 'ghost', action: 'cancel' },
    {
      label: 'Assign',
      variant: 'accent',
      disabled: !this.selectedDiagnosticQuestionSet() || !this.selectedDiagnosticTesterId(),
      action: 'assign'
    }
  ]);

  // API Key Create Modal state
  isApiKeyCreateModalOpen = signal(false);
  apiKeyCreateForm = signal({
    name: '',
    description: '',
    tenant_id: null as number | null,
    rate_limit: 1000,
    expires_at: ''
  });
  createdApiKey = signal<{ key: string; name: string } | null>(null);

  // Tenant Profile Modal state
  isTenantProfileModalOpen = signal(false);
  tenantProfileForm = signal({
    name: '',
    description: '',
    logo: null as File | null
  });
  tenantProfilePreviewUrl = signal<string | null>(null);
  
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

  tenantProfileModalActions = computed<ModalAction[]>(() => [
    {
      label: 'Cancel',
      variant: 'ghost',
      action: 'cancel'
    },
    {
      label: 'Update',
      variant: 'primary',
      disabled: !this.tenantProfileForm().name.trim(),
      action: 'save'
    }
  ]);

  apiKeyCreateModalActions = computed<ModalAction[]>(() => {
    const form = this.apiKeyCreateForm();
    const isValid = form.name.trim() && form.tenant_id !== null;
    
    return [
      {
        label: 'Cancel',
        variant: 'ghost',
        action: 'cancel'
      },
      {
        label: 'Create',
        variant: 'accent',
        disabled: !isValid,
        action: 'create'
      }
    ];
  });

  openDeleteModal(tab: 'tenants' | 'tenant-profile' | 'users' | 'warehouses' | 'wifi' | 'labels' | 'workflows' | 'grades' | 'ota-updates' | 'api-keys' | 'questions', row: MgmtRow) {
    this.deleteContext.set({ tab, row });
    this.isDeleteModalOpen.set(true);
  }

  openDiagnosticAssignModal(questionSet: DiagnosticQuestionSet) {
    this.selectedDiagnosticQuestionSet.set(questionSet);
    this.selectedDiagnosticTesterId.set(null);
    this.isDiagnosticAssignModalOpen.set(true);
    this.loadTesterOptionsForTenant();
  }

  closeDiagnosticAssignModal() {
    this.isDiagnosticAssignModalOpen.set(false);
    this.selectedDiagnosticQuestionSet.set(null);
    this.selectedDiagnosticTesterId.set(null);
  }

  onDiagnosticAssignModalAction(action: string): void {
    if (action === 'assign') {
      this.confirmDiagnosticAssign();
    } else if (action === 'cancel') {
      this.closeDiagnosticAssignModal();
    }
  }

  confirmDiagnosticAssign() {
    const questionSetId = this.selectedDiagnosticQuestionSet()?.id;
    const testerId = this.selectedDiagnosticTesterId();
    if (!questionSetId || !testerId) return;

    this.loading.set(true);
    this.api.assignDiagnosticQuestionSet({ question_set_id: questionSetId, tester_id: testerId }).subscribe({
      next: () => {
        this.loading.set(false);
        this.closeDiagnosticAssignModal();
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

  onDiagnosticTesterSelect(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedDiagnosticTesterId.set(value ? Number(value) : null);
  }

  getSelectedDiagnosticQuestionSetTitle(): string {
    const questionSet = this.selectedDiagnosticQuestionSet();
    return questionSet ? questionSet.title : '';
  }

  openApiKeyCreateModal() {
    this.apiKeyCreateForm.set({
      name: '',
      description: '',
      tenant_id: null,
      rate_limit: 1000,
      expires_at: ''
    });
    this.createdApiKey.set(null);
    this.isApiKeyCreateModalOpen.set(true);
  }

  closeApiKeyCreateModal() {
    this.isApiKeyCreateModalOpen.set(false);
    this.apiKeyCreateForm.set({
      name: '',
      description: '',
      tenant_id: null,
      rate_limit: 1000,
      expires_at: ''
    });
    this.createdApiKey.set(null);
  }

  onApiKeyCreateModalAction(action: string): void {
    if (action === 'create') {
      this.createApiKey();
    } else if (action === 'cancel') {
      this.closeApiKeyCreateModal();
    }
  }

  createApiKey() {
    const form = this.apiKeyCreateForm();
    if (!form.name.trim() || !form.tenant_id) return;

    this.loading.set(true);
    const requestData: any = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      rate_limit: form.rate_limit,
      tenant_id: form.tenant_id
    };

    if (form.expires_at) {
      requestData.expires_at = new Date(form.expires_at).toISOString();
    }

    this.api.createApiKey(requestData).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.data && res.data.key) {
          this.createdApiKey.set({ key: res.data.key, name: res.data.name });
          this.toast.success('API Key created successfully! Copy the key now - it won\'t be shown again.');
          this.fetchData(); // Refresh the list
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err.error?.message || 'Failed to create API key');
      }
    });
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
    let deleteObservable: any;

    if (ctx.tab === 'users') {
      deleteObservable = this.api.deleteUser((ctx.row as any).id);
    } else if (ctx.tab === 'warehouses') {
      deleteObservable = this.api.deleteWarehouse((ctx.row as any).id);
    } else if (ctx.tab === 'wifi') {
      deleteObservable = this.api.deleteWifiProfile((ctx.row as any).id);
    } else if (ctx.tab === 'tenants') {
      deleteObservable = this.api.deleteTenant((ctx.row as any).id);
    } else if (ctx.tab === 'labels') {
      deleteObservable = this.api.deleteLabelTemplate((ctx.row as any).id);
    } else if (ctx.tab === 'workflows') {
      deleteObservable = this.api.deleteWorkflow((ctx.row as any).id);
    } else if (ctx.tab === 'grades') {
      deleteObservable = this.api.deleteGrade((ctx.row as any).id);
    } else if (ctx.tab === 'ota-updates') {
      deleteObservable = this.api.deleteOtaUpdate((ctx.row as any).id);
    } else if (ctx.tab === 'api-keys') {
      deleteObservable = this.api.deleteApiKey((ctx.row as any).id);
    } else if (ctx.tab === 'questions') {
      deleteObservable = this.api.deleteDiagnosticQuestionSet((ctx.row as any).id);
    }

    if (deleteObservable) {
      deleteObservable.subscribe({
        next: () => {
          this.loading.set(false);
          this.closeDeleteModal();
          this.fetchData(); // Refresh the data
          // Show success message
          const entityName = ctx.tab === 'tenants' ? 'Tenant' : 
                             ctx.tab === 'users' ? 'User' :
                             ctx.tab === 'warehouses' ? 'Warehouse' :
                             ctx.tab === 'wifi' ? 'WiFi Profile' :
                             ctx.tab === 'labels' ? 'Label Template' :
                             ctx.tab === 'workflows' ? 'Workflow' :
                             ctx.tab === 'grades' ? 'Grade' :
                             ctx.tab === 'api-keys' ? 'API Key' :
                             ctx.tab === 'questions' ? 'Question Set' :
                             'OTA Update';
          this.toast.deleteSuccess(entityName);
        },
        error: (error: any) => {
          console.error('Failed to delete:', error);
          this.loading.set(false);
          this.closeDeleteModal();
          // Show error message with backend message if available
          const entityName = ctx.tab === 'tenants' ? 'Tenant' : 
                             ctx.tab === 'users' ? 'User' :
                             ctx.tab === 'warehouses' ? 'Warehouse' :
                             ctx.tab === 'wifi' ? 'WiFi Profile' :
                             ctx.tab === 'labels' ? 'Label Template' :
                             ctx.tab === 'workflows' ? 'Workflow' :
                             ctx.tab === 'grades' ? 'Grade' :
                             ctx.tab === 'api-keys' ? 'API Key' :
                             ctx.tab === 'questions' ? 'Question Set' :
                             'OTA Update';
          const errorMessage = error?.error?.message || error?.message;
          if (errorMessage) {
            this.toastr.error(errorMessage, `Delete ${entityName} Failed`);
          } else {
            this.toast.deleteError(entityName);
          }
        }
      });
    }
  }

  // Columns vary by tab
  columns = computed<ColumnDef<MgmtRow>[]>(() => {
    switch (this.activeTab()) {
      case 'tenant-profile':
        return [
          { header: 'Name', accessorKey: 'name' as any, meta: { truncateText: true, truncateMaxWidth: '200px' } },
          { header: 'Description', accessorKey: 'description' as any, meta: { truncateText: true, truncateMaxWidth: '250px' } },
          { 
            header: 'Logo', 
            id: 'logo' as any, 
            enableSorting: false as any, 
            accessorFn: (r: any) => r.logo ? 'Yes' : 'No',
            meta: { 
              cellClass: () => 'text-left'
            }
          },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No'), enableSorting: false },
          {
            header: 'Actions',
            id: 'actions' as any,
            enableSorting: false as any,
            meta: {
              actions: [
                { key: 'edit', label: 'Edit', class: 'text-primary' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      case 'tenants':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'Name', accessorKey: 'name' as any, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          { header: 'Description', accessorKey: 'description' as any, meta: { truncateText: true, truncateMaxWidth: '200px' } },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No'), enableSorting: false },
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
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'Username', accessorKey: 'user_name' as any, meta: { truncateText: true, truncateMaxWidth: '120px' } },
          { header: 'Name', accessorKey: 'name' as any, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          
          { header: 'Role', accessorKey: 'role_name' as any, meta: { truncateText: true, truncateMaxWidth: '100px' } },
          { header: 'Tenant', accessorKey: 'tenant_name' as any, meta: { truncateText: true, truncateMaxWidth: '120px' } },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No'), enableSorting: false },
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
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'Name', accessorKey: 'name' as any, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          { header: 'Description', accessorKey: 'description' as any, meta: { truncateText: true, truncateMaxWidth: '200px' } },
          { header: 'Tenant', accessorKey: 'tenant_name' as any, meta: { truncateText: true, truncateMaxWidth: '120px' } },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No'), enableSorting: false },
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
      case 'wifi':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'Name', accessorKey: 'name' as any, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          { header: 'SSID', accessorKey: 'ssid' as any, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          { header: 'Tenant', accessorKey: 'tenant_name' as any, meta: { truncateText: true, truncateMaxWidth: '120px' } },
          { header: 'Active', id: 'status', accessorFn: (r: any) => (r.status ? 'Yes' : 'No'), enableSorting: false },
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
      case 'labels':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'Name', accessorKey: 'name' as any, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          { header: 'Description', accessorKey: 'description' as any, meta: { truncateText: true, truncateMaxWidth: '200px' } },
          { header: 'Tenant', accessorKey: 'tenant_name' as any, meta: { truncateText: true, truncateMaxWidth: '120px' } },
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
      case 'workflows':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'Name', accessorKey: 'name' as any, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          { header: 'Description', accessorKey: 'description' as any, meta: { truncateText: true, truncateMaxWidth: '200px' } },
          { header: 'Tenant', accessorKey: 'tenant_name' as any, meta: { truncateText: true, truncateMaxWidth: '120px' } },
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
      case 'grades':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'Name', accessorKey: 'name' as any, enableSorting: true, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          { 
            header: 'Color', 
            id: 'color_display' as any, 
            enableSorting: false as any, 
            accessorFn: (r: any) => r.color,
            meta: { 
              renderColor: true,
              cellClass: () => 'text-left'
            }
          },
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
      case 'questions':
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
                { key: 'view-assigned', label: 'View assigned testers', class: 'text-secondary' },
                { key: 'edit', label: 'Edit', class: 'text-primary' },
                { key: 'delete', label: 'Delete', class: 'text-error' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      case 'ota-updates':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'Version', accessorKey: 'version' as any, enableSorting: true, meta: { truncateText: true, truncateMaxWidth: '120px' } },
          { header: 'Target OS', accessorKey: 'target_os' as any, enableSorting: true, accessorFn: (r: any) => {
            const osMap = { 'window': 'Windows', 'macos': 'macOS' };
            return (osMap as any)[r.target_os] || r.target_os;
          } },
          { header: 'Architecture', accessorKey: 'target_architecture' as any, enableSorting: true },
          { header: 'Channel', accessorKey: 'release_channel' as any, enableSorting: true, accessorFn: (r: any) => {
            const channelMap = { 'stable': 'Stable', 'beta': 'Beta', 'dev': 'Development' };
            return (channelMap as any)[r.release_channel] || r.release_channel;
          } },
          { header: 'URL', accessorKey: 'url' as any, enableSorting: true, meta: { truncateText: true, truncateMaxWidth: '200px' } },
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
      case 'api-keys':
        return [
          { header: 'S.No', id: 'row_number' as any, enableSorting: false as any, accessorFn: (r: any) => {
            const idx = this.data().indexOf(r as any);
            const base = this.pageIndex() * this.pageSize();
            return base + (idx >= 0 ? idx : 0) + 1;
          } },
          { header: 'Name', accessorKey: 'name' as any, enableSorting: true, meta: { truncateText: true, truncateMaxWidth: '150px' } },
          { header: 'Key Prefix', accessorKey: 'key_display' as any, enableSorting: false, meta: { truncateText: true, truncateMaxWidth: '120px' } },
          { header: 'Tenant', accessorKey: 'tenant_name' as any, enableSorting: false, meta: { truncateText: true, truncateMaxWidth: '120px' } },
          { header: 'Rate Limit', accessorKey: 'rate_limit' as any, enableSorting: true },
          { header: 'Usage Count', accessorKey: 'usage_count' as any, enableSorting: true },
          { header: 'Status', id: 'status' as any, enableSorting: false, accessorFn: (r: any) => {
            if (r.revoked_at) return 'Revoked';
            if (r.expires_at && new Date(r.expires_at) < new Date()) return 'Expired';
            return r.is_active ? 'Active' : 'Inactive';
          } },
          { header: 'Last Used', accessorKey: 'last_used_at' as any, enableSorting: true, accessorFn: (r: any) => {
            if (!r.last_used_at) return 'Never';
            return new Date(r.last_used_at).toLocaleDateString();
          } },
          {
            header: 'Actions',
            id: 'actions' as any,
            enableSorting: false as any,
            meta: {
              actions: [
                { key: 'revoke', label: 'Revoke', class: 'text-warning' },
                { key: 'delete', label: 'Delete', class: 'text-error' },
              ],
              cellClass: () => 'text-right'
            }
          } as any,
        ];
      default:
        return [] as any;
    }
  });

  // Search placeholder per tab
  searchPlaceholder = computed(() => {
    switch (this.activeTab()) {
      case 'tenant-profile':
        return 'Tenant information';
      case 'tenants':
        return 'Search tenants';
      case 'users':
        return 'Search by name, username, or email';
      case 'warehouses':
        return 'Search warehouses';
      case 'wifi':
        return 'Search WiFi profiles';
      case 'labels':
        return 'Search label templates';
      case 'workflows':
        return 'Search workflows';
      case 'grades':
        return 'Search grades';
      case 'questions':
        return 'Search questions sets';
      case 'ota-updates':
        return 'Search OTA updates';
      case 'api-keys':
        return 'Search API keys by name';
      default:
        return '';
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
    else if (tab === 'api-keys' && this.isSuperAdmin()) this.activeTab.set('api-keys');
    else if (tab === 'tenant-profile' && !this.isSuperAdmin()) this.activeTab.set('tenant-profile');
    else if (tab === 'warehouses' || tab === 'wifi' || tab === 'users' || tab === 'labels' || tab === 'workflows' || tab === 'grades' || tab === 'ota-updates') this.activeTab.set(tab as any);
    else this.activeTab.set(this.isSuperAdmin() ? 'users' : 'tenant-profile');

    // Initialize pagination with service fallback
    this.pageIndex.set(Math.max(0, num('page', 1) - 1));
    const urlPageSize = num('limit', 0);
    const preferredPageSize = this.paginationService.getPageSizeWithFallback(urlPageSize > 0 ? urlPageSize : null);
    this.pageSize.set(preferredPageSize);
   
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

    // Debounce search input
    effect(() => {
      const searchValue = this.search();
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.searchTimeout = setTimeout(() => {
        this.debouncedSearch.set(searchValue);
      }, 500); // 500ms debounce delay
    });

    // Fetch data when state changes
    effect(() => {
      if (!this.initialized()) return;
      this.activeTab();
      this.pageIndex();
      this.pageSize();
      this.debouncedSearch();
      this.selectedRoleId();
      this.selectedTenantId();
      this.selectedUserActive();
      this.selectedApiKeyActive();
      this.sortField();
      this.sortOrder();
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
    if (tab === 'tenant-profile') {
      // Fetch current user's tenant information
      const currentUser = this.auth.currentUser();
      if (currentUser?.tenant_id) {
        this.api.getTenant(currentUser.tenant_id).subscribe({
          next: (res) => {
            if (seq !== this.requestSeq) return;
            const tenant = res.data;
            if (tenant) {
              this.currentTenant.set(tenant);
              this.data.set([tenant] as any);
              this.total.set(1);
            }
            this.loading.set(false);
          },
          error: () => { 
            if (seq !== this.requestSeq) return; 
            this.loading.set(false); 
          },
        });
      } else {
        this.loading.set(false);
      }
      return;
    }
    if (tab === 'tenants') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.debouncedSearch().trim(); if (s) params = params.set('name', s);
      const sort = this.sortField(); if (sort) params = params.set('sort', sort);
      const order = this.sortOrder(); if (sort) params = params.set('order', order);
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
      const s = this.debouncedSearch().trim(); if (s) params = params.set('search', s);
      const rid = this.selectedRoleId(); if (rid != null) params = params.set('role_id', String(rid));
      if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
      const ia = this.selectedUserActive(); if (ia !== 'any') params = params.set('is_active', ia === 'true' ? 'true' : 'false');
      const sort = this.sortField(); if (sort) params = params.set('sort', sort);
      const order = this.sortOrder(); if (sort) params = params.set('order', order);
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
      const s = this.debouncedSearch().trim(); if (s) params = params.set('search', s);
      if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
      const sort = this.sortField(); if (sort) params = params.set('sort', sort);
      const order = this.sortOrder(); if (sort) params = params.set('order', order);
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

    // wifi/labels/workflows - no server pagination; client-side filter + paginate
    let params = new HttpParams();
    if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
    if (tab === 'wifi') {
      this.api.getWifiProfiles(params).subscribe({
        next: (res) => {
          if (seq !== this.requestSeq) return;
          const all = ((res.data ?? []) as WiFiProfile[]).map(p => ({
            ...p,
            tenant_name: p.tenant_name ?? String(p.tenant_id)
          }));
          const s = this.debouncedSearch().trim().toLowerCase();
          let filtered = s ? all.filter(r => `${r.name} ${r.ssid}`.toLowerCase().includes(s)) : all;
          
          // Apply client-side sorting
          const sortField = this.sortField();
          const sortOrder = this.sortOrder();
          if (sortField) {
            filtered.sort((a: any, b: any) => {
              const aVal = a[sortField] ?? '';
              const bVal = b[sortField] ?? '';
              const comparison = String(aVal).localeCompare(String(bVal));
              return sortOrder === 'desc' ? -comparison : comparison;
            });
          }
          this.total.set(filtered.length);
          const start = this.pageIndex() * this.pageSize();
          const paged = filtered.slice(start, start + this.pageSize());
          this.data.set(paged);
          this.loading.set(false);
        },
        error: () => { if (seq !== this.requestSeq) return; this.loading.set(false); },
      });
      return;
    }
    if (tab === 'labels') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.debouncedSearch().trim(); if (s) params = params.set('search', s);
      if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
      const sort = this.sortField(); if (sort) params = params.set('sort', sort);
      const order = this.sortOrder(); if (sort) params = params.set('order', order);
      this.api.getLabelTemplates(params).subscribe({
        next: (res) => { 
          if (seq !== this.requestSeq) return; 
          const labels = (res.data ?? []).map(r => ({
            ...r,
            tenant_name: (r as any).tenant_name ?? String(r.tenant_id)
          }));
          this.data.set(labels); 
          this.total.set(res.meta?.total ?? 0); 
          this.loading.set(false); 
        },
        error: () => { if (seq !== this.requestSeq) return; this.loading.set(false); },
      });
      return;
    }
    if (tab === 'workflows') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.debouncedSearch().trim(); if (s) params = params.set('search', s);
      if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
      const sort = this.sortField(); if (sort) params = params.set('sort', sort);
      const order = this.sortOrder(); if (sort) params = params.set('order', order);
      this.api.getWorkflows(params).subscribe({
        next: (res) => { 
          if (seq !== this.requestSeq) return; 
          const workflows = (res.data ?? []).map(r => ({
            ...r,
            tenant_name: (r as any).tenant_name ?? String(r.tenant_id)
          }));
          this.data.set(workflows); 
          this.total.set(res.meta?.total ?? 0); 
          this.loading.set(false); 
        },
        error: () => { if (seq !== this.requestSeq) return; this.loading.set(false); },
      });
      return;
    }
    if (tab === 'grades') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.debouncedSearch().trim(); if (s) params = params.set('search', s);
      if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
      const sort = this.sortField(); if (sort) params = params.set('sort', sort);
      const order = this.sortOrder(); if (sort) params = params.set('order', order);
      this.api.getGrades(params).subscribe({
        next: (res) => { 
          if (seq !== this.requestSeq) return; 
          const grades = (res.data ?? []).map(g => ({
            ...g,
            tenant_name: (g as any).tenant_name ?? String(g.tenant_id)
          }));
          this.data.set(grades); 
          this.total.set(res.meta?.total ?? 0); 
          this.loading.set(false); 
        },
        error: () => { if (seq !== this.requestSeq) return; this.loading.set(false); },
      });
      return;
    }
    if (tab === 'questions') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.debouncedSearch().trim(); if (s) params = params.set('search', s);
      if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
      const sort = this.sortField(); if (sort) params = params.set('sort', sort);
      const order = this.sortOrder(); if (sort) params = params.set('order', order);
      this.api.getDiagnosticQuestionSets(params).subscribe({
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
    if (tab === 'ota-updates') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.debouncedSearch().trim(); if (s) params = params.set('search', s);
      if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
      const sort = this.sortField(); if (sort) params = params.set('sort', sort);
      const order = this.sortOrder(); if (sort) params = params.set('order', order);
      this.api.getOtaUpdates(params).subscribe({
        next: (res) => { 
          if (seq !== this.requestSeq) return; 
          const otaUpdates = res.data ?? [];
          this.data.set(otaUpdates); 
          this.total.set(res.meta?.total ?? otaUpdates.length); 
          this.loading.set(false); 
        },
        error: () => { if (seq !== this.requestSeq) return; this.loading.set(false); },
      });
      return;
    }
    if (tab === 'api-keys') {
      let params = new HttpParams()
        .set('page', String(this.pageIndex() + 1))
        .set('limit', String(this.pageSize()));
      const s = this.debouncedSearch().trim(); if (s) params = params.set('search', s);
      if (this.isSuperAdmin()) { 
        const tid = this.selectedTenantId(); 
        if (tid != null) params = params.set('tenant_id', String(tid)); 
      }
      // Handle is_active filter
      const isActive = this.selectedApiKeyActive();
      if (isActive === 'true') params = params.set('is_active', 'true');
      else if (isActive === 'false') params = params.set('is_active', 'false');
      
      this.api.getApiKeys(params).subscribe({
        next: (res) => { 
          if (seq !== this.requestSeq) return; 
          const apiKeys = res.data ?? [];
          this.data.set(apiKeys); 
          this.total.set(res.pagination?.total ?? 0); 
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
    const parseNum = (v?: string) => {
      if (!v) return null; const n = Number(v); return Number.isFinite(n) ? n : null;
    };
    if (this.isSuperAdmin()) this.selectedTenantId.set(parseNum(f['tenant_id']));
    if (this.activeTab() === 'users') {
      this.selectedRoleId.set(parseNum(f['role_id']));
      const ia = f['is_active']; this.selectedUserActive.set(ia === 'true' || ia === 'false' ? (ia as any) : 'any');
    }
    if (this.activeTab() === 'api-keys') {
      const ia = f['is_active']; 
      this.selectedApiKeyActive.set(ia === 'true' || ia === 'false' ? (ia as '' | 'true' | 'false') : '');
    }
    this.pageIndex.set(0); // reset
  }

  onSortingChange(state: Array<{ id: string; desc: boolean }>) {
    if (state.length === 0) {
      // No sorting applied
      this.sortField.set(null);
      this.sortOrder.set('asc');
    } else {
      // Use the first sort state
      const sort = state[0];
      this.sortField.set(sort.id);
      this.sortOrder.set(sort.desc ? 'desc' : 'asc');
    }
    this.pageIndex.set(0); // Reset to first page when sorting changes
  }

  onTabChange(key: string | null) {
    const k = (key ?? (this.isSuperAdmin() ? 'users' : 'tenant-profile')) as 'tenants' | 'tenant-profile' | 'users' | 'warehouses' | 'wifi' | 'labels' | 'workflows' | 'grades' | 'ota-updates' | 'api-keys';
    if (k !== this.activeTab()) {
      this.activeTab.set(k);
      // reset some filters per tab
      this.search.set('');
      this.pageIndex.set(0);
      // reset sorting when tab changes
      this.sortField.set(null);
      this.sortOrder.set('asc');
    }
  }

  // Header primary action click - navigate to form pages
  onPrimaryActionClick() {
    const t = this.activeTab();
    if (t === 'tenants') {
      this.router.navigate(['/management/tenants/add']);
    } else if (t === 'tenant-profile') {
      this.openTenantProfileModal();
    } else if (t === 'users') {
      this.router.navigate(['/management/users/add']);
    } else if (t === 'warehouses') {
      this.router.navigate(['/management/warehouses/add']);
    } else if (t === 'wifi') {
      this.router.navigate(['/management/wifi-profiles/add']);
    } else if (t === 'labels') {
      this.router.navigate(['/label']);
    } else if (t === 'workflows') {
      this.router.navigate(['/workflow-editor']);
    } else if (t === 'grades') {
      this.openGradeModal();
    } else if (t === 'questions') {
      this.router.navigate(['/questions/new']);
    } else if (t === 'ota-updates') {
      this.openOtaUpdateModal();
    } else if (t === 'api-keys') {
      this.openApiKeyCreateModal();
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
      } else if (tab === 'tenant-profile') {
        this.openTenantProfileModal();
      } else if (tab === 'users') {
        this.router.navigate(['/management/users/edit', row.id]);
      } else if (tab === 'warehouses') {
        this.router.navigate(['/management/warehouses/edit', row.id]);
      } else if (tab === 'wifi') {
        this.router.navigate(['/management/wifi-profiles/edit', row.id]);
      } else if (tab === 'labels') {
        this.router.navigate(['/label', row.id]);
      } else if (tab === 'workflows') {
        this.router.navigate(['/workflow-editor', row.id]);
      } else if (tab === 'grades') {
        this.openGradeModal(row as Grade);
      } else if (tab === 'questions') {
        this.router.navigate(['/questions', (row as any).id, 'edit']);
      } else if (tab === 'ota-updates') {
        this.openOtaUpdateModal(row as OtaUpdate);
      }
      return;
    }

    // Handle delete actions via modal
    if (event.action === 'delete') {
      this.openDeleteModal(tab, row);
      return;
    }

    // Handle revoke action for API keys
    if (event.action === 'revoke' && tab === 'api-keys') {
      this.revokeApiKey(row as ApiKey);
      return;
    }

    // Handle assign action for questions
    if (event.action === 'assign' && tab === 'questions') {
      this.openDiagnosticAssignModal(row as DiagnosticQuestionSet);
      return;
    }

    // Handle view-assigned action for questions
    if (event.action === 'view-assigned' && tab === 'questions') {
      this.openAssignedModal(row as any);
      return;
    }

  // Assignment actions for wifi, labels, workflows, and ota-updates
    if (tab === 'wifi' || tab === 'labels' || tab === 'workflows' || tab === 'ota-updates') {
      const assignableRow = row as WiFiProfile | LabelTemplateRecord | WorkflowRecord | OtaUpdate;
      if (event.action === 'assign') {
        this.openAssignModal(assignableRow as any);
        return;
      }
      if (event.action === 'view-assigned') {
        this.openAssignedModal(assignableRow as any);
        return;
      }
    }
  }

  revokeApiKey(apiKey: ApiKey) {
    if (!confirm(`Are you sure you want to revoke the API key "${apiKey.name}"? This action cannot be undone.`)) {
      return;
    }

    this.loading.set(true);
    this.api.revokeApiKey(apiKey.id, { reason: 'Revoked by admin' }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('API key revoked successfully');
        this.fetchData();
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err.error?.message || 'Failed to revoke API key');
      }
    });
  }

  // Assign tester modal state
  isAssignModalOpen = signal(false);
  selectedWifiProfile = signal<WiFiProfile | null>(null);
  selectedLabelTemplate = signal<LabelTemplateRecord | null>(null);
  selectedWorkflow = signal<WorkflowRecord | null>(null);
  selectedAssignTesterId = signal<number | null>(null);
  selectedAssignProfileId = signal<number | null>(null);
  
  assignModalActions = computed<ModalAction[]>(() => [
    {
      label: 'Cancel',
      variant: 'ghost',
      action: 'cancel'
    },
    {
      label: 'Assign',
      variant: 'primary',
      disabled: this.selectedAssignTesterId() == null || (
        (this.activeTab() === 'wifi' && !this.selectedWifiProfile() && this.selectedAssignProfileId() == null)
      ),
      action: 'assign'
    }
  ]);

  private loadTesterOptionsForTenant() {
    let params = new HttpParams().set('limit', '1000');
    const rid = this.testerRoleId();
    if (rid != null) params = params.set('role_id', String(rid));
    if (this.isSuperAdmin()) {
      const tid = this.selectedTenantId();
      if (tid != null) params = params.set('tenant_id', String(tid));
    }
    this.api.getUsers(params).subscribe({
      next: (res) => {
        const opts = (res.data ?? []).map(u => ({ label: u.user_name || u.name, value: String(u.id) }));
        this.testerOptions.set(opts);
        // Don't auto-select any tester - require explicit selection
      },
      error: (error) => {
        console.error('Failed to load tester options:', error);
        this.testerOptions.set([]);
        this.toast.loadingError('available testers');
      }
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



  openAssignModal(row: WiFiProfile | LabelTemplateRecord | WorkflowRecord | OtaUpdate) {
    if ((this.activeTab() as any) === 'wifi') {
      this.selectedWifiProfile.set(row as WiFiProfile);
    } else if ((this.activeTab() as any) === 'labels') {
      this.selectedLabelTemplate.set(row as LabelTemplateRecord);
    } else if ((this.activeTab() as any) === 'workflows') {
      this.selectedWorkflow.set(row as WorkflowRecord);
    } else if ((this.activeTab() as any) === 'ota-updates') {
      this.selectedOtaUpdate.set(row as OtaUpdate);
    }
    this.selectedAssignTesterId.set(null);
    this.selectedAssignProfileId.set(null);
    this.isAssignModalOpen.set(true);
    this.loadTesterOptionsForTenant();
  }

  openAssignModalNoProfile() {
    this.selectedWifiProfile.set(null);
    this.selectedLabelTemplate.set(null);
    this.selectedWorkflow.set(null);
    this.selectedAssignTesterId.set(null);
    this.selectedAssignProfileId.set(null);
    this.isAssignModalOpen.set(true);
    if (this.activeTab() === 'wifi') this.loadWifiOptionsForTenant();
    this.loadTesterOptionsForTenant();
  }

  closeAssignModal() {
    this.isAssignModalOpen.set(false);
    this.selectedWifiProfile.set(null);
    this.selectedLabelTemplate.set(null);
    this.selectedWorkflow.set(null);
    this.selectedAssignTesterId.set(null);
    this.selectedAssignProfileId.set(null);
  }

  onAssignModalAction(action: string): void {
    if (action === 'assign') {
      this.submitAssign();
    } else if (action === 'cancel') {
      this.closeAssignModal();
    }
  }

  submitAssign() {
    const testerId = this.selectedAssignTesterId();
    if (testerId == null) {
      this.toast.validationError('Please select a tester before assigning');
      return;
    }
    this.loading.set(true);
    
    if (this.activeTab() === 'wifi') {
      const profile = this.selectedWifiProfile();
      const profileId = profile ? profile.id : this.selectedAssignProfileId();
      if (profileId == null) { 
        this.loading.set(false); 
        this.toast.validationError('Please select a WiFi profile before assigning');
        return; 
      }
      this.api.assignWifiProfile(profileId, testerId).subscribe({ 
        next: () => { 
          this.loading.set(false); 
          this.closeAssignModal(); 
          this.toast.assignmentSuccess('WiFi Profile');
        }, 
        error: (error) => { 
          this.loading.set(false); 
          console.error('Failed to assign WiFi profile:', error);
          this.toast.assignmentError('WiFi profile');
        }
      });
      return;
    }
    
    if (this.activeTab() === 'labels') {
      const rec = this.selectedLabelTemplate();
      if (!rec) { 
        this.loading.set(false); 
        this.toast.validationError('Please select a label template before assigning');
        return; 
      }
      this.api.assignLabelTemplate(rec.id, testerId).subscribe({ 
        next: () => { 
          this.loading.set(false); 
          this.closeAssignModal(); 
          this.toast.assignmentSuccess('Label Template');
        }, 
        error: (error) => { 
          this.loading.set(false); 
          console.error('Failed to assign label template:', error);
          this.toast.assignmentError('Label template');
        }
      });
      return;
    }
    
    if (this.activeTab() === 'workflows') {
      const rec = this.selectedWorkflow();
      if (!rec) { 
        this.loading.set(false); 
        this.toast.validationError('Please select a workflow before assigning');
        return; 
      }
      this.api.assignWorkflow(rec.id, testerId).subscribe({ 
        next: () => { 
          this.loading.set(false); 
          this.closeAssignModal(); 
          this.toast.assignmentSuccess('Workflow');
        }, 
        error: (error) => { 
          this.loading.set(false); 
          console.error('Failed to assign workflow:', error);
          this.toast.assignmentError('Workflow');
        }
      });
      return;
    }
    
    if (this.activeTab() === 'ota-updates') {
      const rec = this.selectedOtaUpdate();
      if (!rec) { 
        this.loading.set(false); 
        this.toast.validationError('Please select an OTA update before assigning');
        return; 
      }
      this.api.assignOtaUpdate(rec.id, testerId).subscribe({ 
        next: () => { 
          this.loading.set(false); 
          this.closeAssignModal(); 
          this.toast.assignmentSuccess('OTA Update');
        }, 
        error: (error) => { 
          this.loading.set(false); 
          console.error('Failed to assign OTA update:', error);
          this.toast.assignmentError('OTA update');
        }
      });
    }
  }

  onAssignTesterSelect(event: Event) {
    const target = event.target as HTMLSelectElement | null;
    const value = target?.value?.trim();
    this.selectedAssignTesterId.set(value && value !== '' ? Number(value) : null);
  }

  onAssignProfileSelect(event: Event) {
    const target = event.target as HTMLSelectElement | null;
    const value = target?.value?.trim();
    this.selectedAssignProfileId.set(value && value !== '' ? Number(value) : null);
  }



  // View assigned testers modal
  isAssignedModalOpen = signal(false);
  assignedTesters = signal<User[]>([]);
  assignedTestersLoading = signal(false);
  
  assignedModalActions = computed<ModalAction[]>(() => [
    {
      label: 'Close',
      variant: 'ghost',
      action: 'close'
    }
  ]);

  openAssignedModal(row: WiFiProfile | LabelTemplateRecord | WorkflowRecord | OtaUpdate | DiagnosticQuestionSet) {
    this.isAssignedModalOpen.set(true);
    this.assignedTestersLoading.set(true);
    this.assignedTesters.set([]); // Clear previous data
    
    let params = new HttpParams();
    if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
    
    if (this.activeTab() === 'wifi') {
      this.selectedWifiProfile.set(row as WiFiProfile);
      this.api.getWifiProfileTesters((row as WiFiProfile).id, params).subscribe({ 
        next: (res) => { 
          this.assignedTesters.set(res.data ?? []); 
          this.assignedTestersLoading.set(false);
        }, 
        error: (error) => { 
          console.error('Failed to load assigned testers:', error);
          this.assignedTesters.set([]); 
          this.assignedTestersLoading.set(false);
          this.toast.loadingError('assigned testers');
        }, 
      });
      return;
    }
    if (this.activeTab() === 'labels') {
      this.selectedLabelTemplate.set(row as LabelTemplateRecord);
      this.api.getLabelTemplateTesters((row as LabelTemplateRecord).id, params).subscribe({ 
        next: (res) => { 
          this.assignedTesters.set(res.data ?? []); 
          this.assignedTestersLoading.set(false);
        }, 
        error: (error) => { 
          console.error('Failed to load assigned testers:', error);
          this.assignedTesters.set([]); 
          this.assignedTestersLoading.set(false);
          this.toast.loadingError('assigned testers');
        }, 
      });
      return;
    }
    if (this.activeTab() === 'workflows') {
      this.selectedWorkflow.set(row as WorkflowRecord);
      this.api.getWorkflowTesters((row as WorkflowRecord).id, params).subscribe({ 
        next: (res) => { 
          this.assignedTesters.set(res.data ?? []); 
          this.assignedTestersLoading.set(false);
        }, 
        error: (error) => { 
          console.error('Failed to load assigned testers:', error);
          this.assignedTesters.set([]); 
          this.assignedTestersLoading.set(false);
          this.toast.loadingError('assigned testers');
        }, 
      });
      return;
    }
    if (this.activeTab() === 'ota-updates') {
      this.selectedOtaUpdate.set(row as OtaUpdate);
      this.api.getOtaUpdateTesters((row as OtaUpdate).id, params).subscribe({ 
        next: (res) => { 
          this.assignedTesters.set(res.data ?? []); 
          this.assignedTestersLoading.set(false);
        }, 
        error: (error) => { 
          console.error('Failed to load assigned testers:', error);
          this.assignedTesters.set([]); 
          this.assignedTestersLoading.set(false);
          this.toast.loadingError('assigned testers');
        }, 
      });
      return;
    }
    if (this.activeTab() === 'questions') {
      this.selectedDiagnosticQuestionSet.set(row as DiagnosticQuestionSet);
      this.api.getDiagnosticQuestionSetTesters((row as DiagnosticQuestionSet).id, params).subscribe({ 
        next: (res) => { 
          this.assignedTesters.set(res.data ?? []); 
          this.assignedTestersLoading.set(false);
        }, 
        error: (error) => { 
          console.error('Failed to load assigned testers for question set:', error);
          this.assignedTesters.set([]); 
          this.assignedTestersLoading.set(false);
          this.toast.loadingError('assigned testers');
        }, 
      });
    }
  }

  unassignTester(userId: number) {
    this.loading.set(true);
    let params = new HttpParams();
    if (this.isSuperAdmin()) { const tid = this.selectedTenantId(); if (tid != null) params = params.set('tenant_id', String(tid)); }
    if (this.activeTab() === 'wifi' && this.selectedWifiProfile()) {
      const profile = this.selectedWifiProfile()!;
      this.api.unassignWifiProfile(profile.id, userId).subscribe({
        next: () => {
          this.assignedTestersLoading.set(true);
          this.api.getWifiProfileTesters(profile.id, params).subscribe({ 
            next: (res) => { 
              this.assignedTesters.set(res.data ?? []); 
              this.loading.set(false); 
              this.assignedTestersLoading.set(false);
              this.toast.unassignmentSuccess('Tester from WiFi Profile');
            }, 
            error: () => { 
              this.loading.set(false); 
              this.assignedTestersLoading.set(false);
              this.toast.loadingError('tester list');
            }, 
          });
        },
        error: (error) => { 
          this.loading.set(false); 
          console.error('Failed to unassign WiFi profile:', error);
          this.toast.unassignmentError('tester from WiFi profile');
        },
      });
      return;
    }
    if (this.activeTab() === 'labels' && this.selectedLabelTemplate()) {
      const rec = this.selectedLabelTemplate()!;
      this.api.unassignLabelTemplate(rec.id, userId).subscribe({
        next: () => {
          this.assignedTestersLoading.set(true);
          this.api.getLabelTemplateTesters(rec.id, params).subscribe({ 
            next: (res) => { 
              this.assignedTesters.set(res.data ?? []); 
              this.loading.set(false); 
              this.assignedTestersLoading.set(false);
              this.toast.unassignmentSuccess('Tester from Label Template');
            }, 
            error: () => { 
              this.loading.set(false); 
              this.assignedTestersLoading.set(false);
              this.toast.loadingError('tester list');
            }, 
          });
        },
        error: (error) => { 
          this.loading.set(false); 
          console.error('Failed to unassign label template:', error);
          this.toast.unassignmentError('tester from label template');
        },
      });
      return;
    }
    if (this.activeTab() === 'workflows' && this.selectedWorkflow()) {
      const rec = this.selectedWorkflow()!;
      this.api.unassignWorkflow(rec.id, userId).subscribe({
        next: () => {
          this.assignedTestersLoading.set(true);
          this.api.getWorkflowTesters(rec.id, params).subscribe({ 
            next: (res) => { 
              this.assignedTesters.set(res.data ?? []); 
              this.loading.set(false); 
              this.assignedTestersLoading.set(false);
              this.toast.unassignmentSuccess('Tester from Workflow');
            }, 
            error: () => { 
              this.loading.set(false); 
              this.assignedTestersLoading.set(false);
              this.toast.loadingError('tester list');
            }, 
          });
        },
        error: (error) => { 
          this.loading.set(false); 
          console.error('Failed to unassign workflow:', error);
          this.toast.unassignmentError('tester from workflow');
        },
      });
      return;
    }
    if (this.activeTab() === 'ota-updates' && this.selectedOtaUpdate()) {
      const rec = this.selectedOtaUpdate()!;
      this.api.unassignOtaUpdate(rec.id, userId).subscribe({
        next: () => {
          this.assignedTestersLoading.set(true);
          this.api.getOtaUpdateTesters(rec.id, params).subscribe({ 
            next: (res) => { 
              this.assignedTesters.set(res.data ?? []); 
              this.loading.set(false); 
              this.assignedTestersLoading.set(false);
              this.toast.unassignmentSuccess('Tester from OTA Update');
            }, 
            error: () => { 
              this.loading.set(false); 
              this.assignedTestersLoading.set(false);
              this.toast.loadingError('tester list');
            }, 
          });
        },
        error: (error) => { 
          this.loading.set(false); 
          console.error('Failed to unassign OTA update:', error);
          this.toast.unassignmentError('tester from OTA update');
        },
      });
      return;
    }
    if (this.activeTab() === 'questions' && this.selectedDiagnosticQuestionSet()) {
      const questionSet = this.selectedDiagnosticQuestionSet()!;
      this.api.unassignDiagnosticQuestionSet(userId).subscribe({
        next: () => {
          this.assignedTestersLoading.set(true);
          this.api.getDiagnosticQuestionSetTesters(questionSet.id, params).subscribe({ 
            next: (res) => { 
              this.assignedTesters.set(res.data ?? []); 
              this.loading.set(false); 
              this.assignedTestersLoading.set(false);
              this.toast.unassignmentSuccess('Tester from Question Set');
            }, 
            error: () => { 
              this.loading.set(false); 
              this.assignedTestersLoading.set(false);
              this.toast.loadingError('tester list');
            }, 
          });
        },
        error: (error) => { 
          this.loading.set(false); 
          console.error('Failed to unassign question set:', error);
          this.toast.unassignmentError('tester from question set');
        },
      });
    }
  }

  closeAssignedModal() {
    this.isAssignedModalOpen.set(false);
    this.assignedTesters.set([]);
    this.assignedTestersLoading.set(false);
    this.selectedWifiProfile.set(null);
    this.selectedLabelTemplate.set(null);
    this.selectedWorkflow.set(null);
    this.selectedOtaUpdate.set(null);
    this.selectedDiagnosticQuestionSet.set(null);
  }

  onAssignedModalAction(action: string): void {
    if (action === 'close') {
      this.closeAssignedModal();
    }
  }

  // Grade modal state
  isGradeModalOpen = signal(false);
  selectedGrade = signal<Grade | null>(null);
  gradeForm = signal({ name: '', color: '#000000' });
  gradeNameError = signal<string | null>(null);
  
  gradeModalActions = computed<ModalAction[]>(() => [
    {
      label: 'Cancel',
      variant: 'ghost',
      action: 'cancel'
    },
    {
      label: this.selectedGrade() ? 'Update' : 'Create',
      variant: 'primary',
      disabled: !this.gradeForm().name.trim() || !!this.gradeNameError(),
      action: 'save'
    }
  ]);

  openGradeModal(grade?: Grade) {
    if (grade) {
      this.selectedGrade.set(grade);
      this.gradeForm.set({ name: grade.name, color: grade.color });
    } else {
      this.selectedGrade.set(null);
      this.gradeForm.set({ name: '', color: '#000000' });
    }
    this.gradeNameError.set(null);
    this.isGradeModalOpen.set(true);
  }

  closeGradeModal() {
    this.isGradeModalOpen.set(false);
    this.selectedGrade.set(null);
    this.gradeForm.set({ name: '', color: '#000000' });
    this.gradeNameError.set(null);
  }

  onGradeModalAction(action: string): void {
    if (action === 'save') {
      this.saveGrade();
    } else if (action === 'cancel') {
      this.closeGradeModal();
    }
  }

  saveGrade() {
    const form = this.gradeForm();
    if (!form.name.trim() || this.gradeNameError()) return;

    this.loading.set(true);
    const payload = { name: form.name.trim(), color: form.color };
    const isUpdate = !!this.selectedGrade();

    const saveObservable = isUpdate
      ? this.api.updateGrade(this.selectedGrade()!.id, payload)
      : this.api.createGrade(payload);

    saveObservable.subscribe({
      next: () => {
        this.loading.set(false);
        this.closeGradeModal();
        this.fetchData(); // Refresh the data
        const action = isUpdate ? 'updated' : 'created';
        this.toast.saveSuccess('Grade', action);
      },
      error: (error: any) => {
        console.error('Failed to save grade:', error);
        this.loading.set(false);
        const action = isUpdate ? 'update' : 'create';
        this.toast.saveError('Grade', action);
      }
    });
  }

  onGradeNameChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    
    // Validate: only letters and spaces allowed
    const nameRegex = /^[a-zA-Z\s]*$/;
    if (!nameRegex.test(value)) {
      this.gradeNameError.set('Name must contain only letters and spaces');
    } else if (value.trim() && value.trim().length < 2) {
      this.gradeNameError.set('Name must be at least 2 characters');
    } else {
      this.gradeNameError.set(null);
    }
    
    this.gradeForm.update(form => ({ ...form, name: value }));
  }

  onGradeColorChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.gradeForm.update(form => ({ ...form, color: target.value }));
  }

  // OTA Update modal state
  isOtaUpdateModalOpen = signal(false);
  selectedOtaUpdate = signal<OtaUpdate | null>(null);
  otaUpdateForm = signal({
    version: '',
    url: '',
    target_os: 'window' as 'window' | 'macos',
    target_architecture: 'x86' as 'x86' | 'arm',
    release_channel: 'stable' as 'stable' | 'beta' | 'dev'
  });
  otaUpdateVersionError = signal<string | null>(null);
  otaUpdateUrlError = signal<string | null>(null);
  
  otaUpdateModalActions = computed<ModalAction[]>(() => [
    {
      label: 'Cancel',
      variant: 'ghost',
      action: 'cancel'
    },
    {
      label: this.selectedOtaUpdate() ? 'Update' : 'Create',
      variant: 'primary',
      disabled: !this.otaUpdateForm().version.trim() || !this.otaUpdateForm().url.trim() || !!this.otaUpdateVersionError() || !!this.otaUpdateUrlError(),
      action: 'save'
    }
  ]);

  openOtaUpdateModal(otaUpdate?: OtaUpdate) {
    if (otaUpdate) {
      this.selectedOtaUpdate.set(otaUpdate);
      this.otaUpdateForm.set({
        version: otaUpdate.version,
        url: otaUpdate.url,
        target_os: otaUpdate.target_os,
        target_architecture: otaUpdate.target_architecture,
        release_channel: otaUpdate.release_channel
      });
    } else {
      this.selectedOtaUpdate.set(null);
      this.otaUpdateForm.set({
        version: '',
        url: '',
        target_os: 'window',
        target_architecture: 'x86',
        release_channel: 'stable'
      });
    }
    this.otaUpdateVersionError.set(null);
    this.otaUpdateUrlError.set(null);
    this.isOtaUpdateModalOpen.set(true);
  }

  closeOtaUpdateModal() {
    this.isOtaUpdateModalOpen.set(false);
    this.selectedOtaUpdate.set(null);
    this.otaUpdateForm.set({
      version: '',
      url: '',
      target_os: 'window',
      target_architecture: 'x86',
      release_channel: 'stable'
    });
    this.otaUpdateVersionError.set(null);
    this.otaUpdateUrlError.set(null);
  }

  onOtaUpdateModalAction(action: string): void {
    if (action === 'save') {
      this.saveOtaUpdate();
    } else if (action === 'cancel') {
      this.closeOtaUpdateModal();
    }
  }

  saveOtaUpdate() {
    const form = this.otaUpdateForm();
    if (!form.version.trim() || !form.url.trim() || this.otaUpdateVersionError() || this.otaUpdateUrlError()) return;

    this.loading.set(true);
    const isUpdate = !!this.selectedOtaUpdate();
    const payload = {
      version: form.version.trim(),
      url: form.url.trim(),
      target_os: form.target_os,
      target_architecture: form.target_architecture,
      release_channel: form.release_channel
    };

    const saveObservable = isUpdate
      ? this.api.updateOtaUpdate(this.selectedOtaUpdate()!.id, payload)
      : this.api.createOtaUpdate(payload);

    saveObservable.subscribe({
      next: () => {
        this.loading.set(false);
        this.closeOtaUpdateModal();
        this.fetchData(); // Refresh the data
        const action = isUpdate ? 'updated' : 'created';
        this.toast.saveSuccess('OTA Update', action);
      },
      error: (error: any) => {
        console.error('Failed to save OTA update:', error);
        this.loading.set(false);
        const action = isUpdate ? 'update' : 'create';
        this.toast.saveError('OTA Update', action);
      }
    });
  }

  onOtaUpdateVersionChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    
    // Validate version format: should be numbers and dots (e.g., 1.0.0, 2.5.1)
    const versionRegex = /^[0-9.]*$/;
    if (value && !versionRegex.test(value)) {
      this.otaUpdateVersionError.set('Version must contain only numbers and dots (e.g., 1.0.0)');
    } else if (value.trim() && !/^\d+(\.\d+)*$/.test(value.trim())) {
      this.otaUpdateVersionError.set('Invalid version format. Use format like 1.0.0');
    } else {
      this.otaUpdateVersionError.set(null);
    }
    
    this.otaUpdateForm.update(form => ({ ...form, version: value }));
  }

  onOtaUpdateUrlChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    
    // Validate URL format
    if (value.trim()) {
      try {
        const url = new URL(value.trim());
        if (!url.protocol.startsWith('http')) {
          this.otaUpdateUrlError.set('URL must start with http:// or https://');
        } else {
          this.otaUpdateUrlError.set(null);
        }
      } catch {
        this.otaUpdateUrlError.set('Please enter a valid URL (e.g., https://example.com/update.zip)');
      }
    } else {
      this.otaUpdateUrlError.set(null);
    }
    
    this.otaUpdateForm.update(form => ({ ...form, url: value }));
  }

  onOtaUpdateTargetOsChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.otaUpdateForm.update(form => ({ ...form, target_os: target.value as 'window' | 'macos' }));
  }

  onOtaUpdateArchitectureChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.otaUpdateForm.update(form => ({ ...form, target_architecture: target.value as 'x86' | 'arm' }));
  }

  onOtaUpdateChannelChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.otaUpdateForm.update(form => ({ ...form, release_channel: target.value as 'stable' | 'beta' | 'dev' }));
  }

  // Tenant Profile Modal Methods
  openTenantProfileModal() {
    const currentTenant = this.currentTenant();
    if (currentTenant) {
      this.tenantProfileForm.set({
        name: currentTenant.name,
        description: currentTenant.description,
        logo: null
      });
    } else {
      this.tenantProfileForm.set({
        name: '',
        description: '',
        logo: null
      });
    }
    this.tenantProfilePreviewUrl.set(null);
    this.isTenantProfileModalOpen.set(true);
  }

  closeTenantProfileModal() {
    this.isTenantProfileModalOpen.set(false);
    this.tenantProfileForm.set({
      name: '',
      description: '',
      logo: null
    });
    this.tenantProfilePreviewUrl.set(null);
  }

  onTenantProfileModalAction(action: string): void {
    if (action === 'save') {
      this.saveTenantProfile();
    } else if (action === 'cancel') {
      this.closeTenantProfileModal();
    }
  }

  saveTenantProfile() {
    const form = this.tenantProfileForm();
    const currentTenant = this.currentTenant();
    if (!form.name.trim() || !currentTenant) return;

    this.loading.set(true);
    
    // If there's a logo file to upload, upload it first
    if (form.logo) {
      this.api.uploadFile(form.logo, 'tenant-logos').subscribe({
        next: (uploadResponse) => {
          const logoUrl = uploadResponse.data?.url;
          this.updateTenantData(currentTenant.id, {
            name: form.name.trim(),
            description: form.description.trim(),
            logo: logoUrl
          });
        },
        error: (error: any) => {
          console.error('Failed to upload logo:', error);
          this.loading.set(false);
          this.toast.error('Failed to upload logo. Please try again.', 'Upload Failed');
        }
      });
    } else {
      // No logo file, just update the text fields
      this.updateTenantData(currentTenant.id, {
        name: form.name.trim(),
        description: form.description.trim()
      });
    }
  }

  private updateTenantData(tenantId: number, tenantData: any) {
    this.api.updateTenant(tenantId, tenantData).subscribe({
      next: () => {
        this.loading.set(false);
        this.closeTenantProfileModal();
        this.fetchData(); // Refresh the data
        this.toast.saveSuccess('Tenant information', 'updated');
      },
      error: (error: any) => {
        console.error('Failed to update tenant:', error);
        this.loading.set(false);
        this.toast.saveError('Tenant information', 'update');
      }
    });
  }

  onTenantProfileNameChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.tenantProfileForm.update(form => ({ ...form, name: target.value }));
  }

  onTenantProfileDescriptionChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.tenantProfileForm.update(form => ({ ...form, description: target.value }));
  }

  onTenantProfileLogoChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] || null;
    this.tenantProfileForm.update(form => ({ ...form, logo: file }));
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.tenantProfilePreviewUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      this.tenantProfilePreviewUrl.set(null);
    }
  }

  // API Key form handlers
  onApiKeyNameChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.apiKeyCreateForm.update(form => ({ ...form, name: target.value }));
  }

  onApiKeyDescriptionChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.apiKeyCreateForm.update(form => ({ ...form, description: target.value }));
  }

  onApiKeyTenantChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const tenantId = target.value ? Number(target.value) : null;
    this.apiKeyCreateForm.update(form => ({ ...form, tenant_id: tenantId }));
  }

  onApiKeyRateLimitChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const rateLimit = Number(target.value) || 1000;
    this.apiKeyCreateForm.update(form => ({ ...form, rate_limit: rateLimit }));
  }

  onApiKeyExpiresAtChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.apiKeyCreateForm.update(form => ({ ...form, expires_at: target.value }));
  }

  copyApiKey(key: string) {
    navigator.clipboard.writeText(key).then(() => {
      this.toast.success('API key copied to clipboard');
    }).catch(() => {
      this.toast.error('Failed to copy API key');
    });
  }
}

import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericPageComponent, type Facet, type GenericTab } from '../../shared/components/generic-page/generic-page.component';
import { GenericModalComponent } from '../../shared/components/generic-modal/generic-modal.component';
import { ColumnDef } from '@tanstack/angular-table';
import { AuthService } from '../../core/services/auth.service';
import { LicensingService, LicenseBalance, LicenseLedgerEntry, LicenseType, CreateLicenseTypeInput, ManualAdjustmentInput, LicenseRequest } from '../../services/licensing.service';
import { ApiService } from '../../core/services/api.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';

type LicensingRow = LicenseBalance | LicenseLedgerEntry | LicenseType | LicenseRequest;

interface Tenant {
  id: number;
  name: string;
}

@Component({
  selector: 'app-licensing',
  imports: [GenericPageComponent, GenericModalComponent, ReactiveFormsModule],
  templateUrl: './licensing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LicensingComponent {
  private readonly licensingService = inject(LicensingService);
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Loading & data
  loading = signal(false);
  data = signal<LicensingRow[]>([]);
  total = signal(0);
  
  // Filter state
  searchQuery = signal('');
  selectedFacets = signal<Record<string, string>>({});

  // Guards
  private initialized = signal(false);

  // Tab state
  activeTab = signal<'balances' | 'history' | 'types' | 'my-requests' | 'approve' | 'quick-grant' | 'reports'>('balances');

  // Modals
  protected showCreateTypeModal = signal(false);
  protected showAdjustmentModal = signal(false);
  protected showApproveModal = signal(false);
  protected showRejectModal = signal(false);
  protected showDetailsModal = signal(false);
  protected submitting = signal(false);
  protected errorMessage = signal<string | null>(null);
  
  // Selected request for modals
  protected selectedRequest = signal<LicenseRequest | null>(null);
  protected rejectionReason = signal('');

  // Options
  licenseTypes = signal<LicenseType[]>([]);
  tenants = signal<Tenant[]>([]);

  isSuperAdmin = computed(() => this.authService.currentUser()?.role_id === 1);

  // Forms
  createTypeForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    product_category: ['', [Validators.required]],
    test_type: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    description: [''],
  });

  adjustmentForm: FormGroup = this.fb.group({
    tenant_id: [null, [Validators.required]],
    license_type_id: [null, [Validators.required]],
    amount: [0, [Validators.required]],
    notes: ['', [Validators.required]],
  });

  // Tabs
  tabs = computed<GenericTab[]>(() => {
    if (this.isSuperAdmin()) {
      // Super admin tabs - exclude My Balances, My Requests, and Quick Grant
      return [
        { key: 'history', label: 'Transaction History' },
        { key: 'types', label: 'License Types' },
        { key: 'approve', label: 'Approve Requests' },
        { key: 'reports', label: 'Usage Reports' }
      ];
    } else {
      // Regular user tabs
      return [
        { key: 'balances', label: 'My Balances' },
        { key: 'history', label: 'Transaction History' },
        { key: 'types', label: 'License Types' },
        { key: 'my-requests', label: 'My Requests' },
      ];
    }
  });

  // Primary action per tab
  primaryAction = computed(() => {
    const t = this.activeTab();
    if (t === 'types' && this.isSuperAdmin()) {
      return { label: 'Create License Type' };
    }
    if (t === 'history' && this.isSuperAdmin()) {
      return { label: 'Manual Adjustment' };
    }
    return null;
  });

  // Facets per tab
  facets = computed<Facet[]>(() => {
    const t = this.activeTab();
    const list: Facet[] = [];
    
    if (t === 'history') {
      const types = this.licenseTypes();
      if (types.length > 0) {
        list.push({
          key: 'license_type',
          label: 'License Type',
          type: 'select',
          options: [
            { label: 'All Types', value: '' },
            ...types.map(lt => ({ label: lt.name, value: lt.id.toString() }))
          ],
        });
      }
      list.push({
        key: 'transaction_type',
        label: 'Transaction Type',
        type: 'select',
        options: [
          { label: 'All', value: '' },
          { label: 'Purchase', value: 'purchase' },
          { label: 'Usage', value: 'usage' },
          { label: 'Refund', value: 'refund' },
          { label: 'Adjustment', value: 'adjustment' },
        ],
      });
    }
    
    return list;
  });

  // Columns per tab
  columns = computed<ColumnDef<LicensingRow>[]>(() => {
    switch (this.activeTab()) {
      case 'balances':
        return [
          { header: 'License Type', accessorKey: 'license_type_name' as any },
          { header: 'Category', accessorKey: 'product_category' as any },
          { header: 'Test Type', accessorKey: 'test_type' as any },
          {
            header: 'Balance',
            accessorKey: 'balance' as any,
            meta: {
              cellClass: (row: any) => {
                if (row.balance <= 0) return 'text-error font-semibold';
                if (row.balance < 10) return 'text-warning font-semibold';
                return 'text-success font-semibold';
              },
            },
          },
          { header: 'Unit Price', accessorKey: 'price' as any, cell: (info: any) => `$${Number(info.getValue()).toFixed(2)}` },
          {
            header: 'Total Value',
            id: 'total_value' as any,
            cell: (info: any) => {
              const row = info.row.original as LicenseBalance;
              return `$${(row.balance * Number(row.price)).toFixed(2)}`;
            },
          },
        ];

      case 'history':
        return [
          { header: 'Date', accessorKey: 'created_at' as any, cell: (info: any) => new Date(info.getValue()).toLocaleDateString() },
          {
            header: 'Type',
            accessorKey: 'transaction_type' as any,
            cell: (info: any) => {
              const type = info.getValue() as string;
              return type.charAt(0).toUpperCase() + type.slice(1);
            },
          },
          {
            header: 'Amount',
            accessorKey: 'amount' as any,
            cell: (info: any) => {
              const amount = Number(info.getValue());
              return amount > 0 ? `+${amount}` : amount;
            },
            meta: {
              cellClass: (row: any) => row.amount > 0 ? 'text-success font-semibold' : 'text-error font-semibold',
            },
          },
          { header: 'Device', accessorKey: 'device_identifier' as any, cell: (info: any) => info.getValue() || 'N/A' },
          { header: 'Notes', accessorKey: 'notes' as any, cell: (info: any) => info.getValue() || 'N/A', meta: { truncateText: true, truncateMaxWidth: '300px' } },
        ];

      case 'types':
        return [
          { header: 'Name', accessorKey: 'name' as any },
          { header: 'Product Category', accessorKey: 'product_category' as any },
          { header: 'Test Type', accessorKey: 'test_type' as any },
          { header: 'Price', accessorKey: 'price' as any, cell: (info: any) => `$${Number(info.getValue()).toFixed(2)}` },
          { header: 'Description', accessorKey: 'description' as any, cell: (info: any) => info.getValue() || 'N/A', meta: { truncateText: true, truncateMaxWidth: '300px' } },
          { header: 'Status', accessorKey: 'status' as any, cell: (info: any) => info.getValue() ? 'Active' : 'Inactive' },
        ];

      case 'my-requests':
        return [
          { header: 'ID', accessorKey: 'id' as any },
          { header: 'Date', accessorKey: 'created_at' as any, cell: (info: any) => new Date(info.getValue()).toLocaleDateString() },
          { header: 'Requested By', accessorKey: 'requested_by_name' as any },
          {
            header: 'Status',
            accessorKey: 'status' as any,
            cell: (info: any) => {
              const status = info.getValue() as string;
              const badge = status === 'pending' ? 'badge-warning' : status === 'approved' ? 'badge-success' : 'badge-error';
              return `<span class="badge ${badge}">${status.toUpperCase()}</span>`;
            },
            meta: { isHtml: true },
          },
          {
            header: 'Actions',
            id: 'actions' as any,
            cell: (info: any) => '', // Not used when actions are defined
            meta: { 
              actions: (row: any) => {
                return [{ key: 'view', label: 'View Details', class: 'btn-accent', icon: 'eye' }];
              }
            },
          },
        ];

      case 'approve':
        return [
          { header: 'ID', accessorKey: 'id' as any },
          { header: 'Date', accessorKey: 'created_at' as any, cell: (info: any) => new Date(info.getValue()).toLocaleDateString() },
          { header: 'Tenant', accessorKey: 'tenant_name' as any, cell: (info: any) => info.getValue() || 'N/A' },
          { header: 'Requested By', accessorKey: 'requested_by_name' as any },
          {
            header: 'Items',
            id: 'items_count' as any,
            cell: (info: any) => {
              const row = info.row.original as LicenseRequest;
              let items = row.items;
              if (typeof items === 'string') {
                try {
                  items = JSON.parse(items);
                } catch (e) {
                  return 'N/A';
                }
              }
              if (!Array.isArray(items)) return 'N/A';
              return `${items.length} type(s)`;
            },
          },
          {
            header: 'Total Qty',
            id: 'total_qty' as any,
            cell: (info: any) => {
              const row = info.row.original as LicenseRequest;
              let items = row.items;
              if (typeof items === 'string') {
                try {
                  items = JSON.parse(items);
                } catch (e) {
                  return 'N/A';
                }
              }
              if (!Array.isArray(items)) return 'N/A';
              return items.reduce((sum, item) => sum + item.quantity, 0);
            },
          },
          {
            header: 'Status',
            accessorKey: 'status' as any,
            cell: (info: any) => {
              const status = info.getValue() as string;
              const badge = status === 'pending' ? 'badge-warning' : status === 'approved' ? 'badge-success' : 'badge-error';
              return `<span class="badge ${badge}">${status.toUpperCase()}</span>`;
            },
            meta: { isHtml: true },
          },
          {
            header: 'Actions',
            id: 'actions' as any,
            cell: (info: any) => '', // Not used when actions are defined
            meta: { 
              actions: (row: any) => {
                const actions = [];
                
                // Only show approve/reject for pending requests
                if (row.status === 'pending') {
                  actions.push(
                    { key: 'approve', label: 'Approve', class: 'btn-success', icon: 'check' },
                    { key: 'reject', label: 'Reject', class: 'btn-error', icon: 'x' }
                  );
                }
                
                // Always show view
                actions.push({ key: 'view', label: 'View', class: '', icon: 'eye' });
                
                return actions;
              }
            },
          },
        ];

      default:
        return [];
    }
  });

  searchPlaceholder = computed<string>(() => {
    switch (this.activeTab()) {
      case 'balances': return 'Search licenses...';
      case 'history': return 'Search transactions...';
      case 'types': return 'Search license types...';
      case 'reports': return 'Search tenants or license types...';
      default: return '';
    }
  });

  constructor() {
    // Hydrate from URL
    const qp = this.route.snapshot.queryParamMap;
    const defaultTab = this.isSuperAdmin() ? 'history' : 'balances';
    const tab = qp.get('tab') || defaultTab;
    
    // Set active tab from URL
    if (this.isSuperAdmin()) {
      const adminTabs = ['history', 'types', 'approve', 'reports'] as const;
      if (adminTabs.includes(tab as any)) {
        this.activeTab.set(tab as any);
      } else {
        this.activeTab.set('history');
      }
    } else {
      const userTabs = ['balances', 'history', 'types', 'my-requests'] as const;
      if (userTabs.includes(tab as any)) {
        this.activeTab.set(tab as any);
      } else {
        this.activeTab.set('balances');
      }
    }

    this.initialized.set(true);

    // Load license types for filters
    this.licensingService.listLicenseTypes().subscribe({
      next: (res) => this.licenseTypes.set(res.data),
      error: (err) => console.error('Error loading license types:', err),
    });

    // Load tenants for superadmin
    if (this.isSuperAdmin()) {
      this.apiService.getTenants().subscribe({
        next: (res) => this.tenants.set(res.data),
        error: (err) => console.error('Error loading tenants:', err),
      });
    }

    // Fetch data when tab changes
    effect(() => {
      if (!this.initialized()) return;
      this.activeTab();
      this.fetchData();
    });

    // URL sync
    effect(() => {
      if (!this.initialized()) return;
      const query: Record<string, any> = {
        tab: this.activeTab(),
      };
      this.router.navigate([], { queryParams: query, replaceUrl: true });
    });
  }

  private fetchData(): void {
    this.loading.set(true);
    const tab = this.activeTab();
    const search = this.searchQuery();
    const facets = this.selectedFacets();

    // All tabs now show data tables

    if (tab === 'balances') {
      this.licensingService.getBalances(search).subscribe({
        next: (res) => {
          this.data.set(res.data as any);
          this.total.set(res.data.length);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error:', err);
          this.loading.set(false);
        },
      });
    } else if (tab === 'history') {
      const licenseTypeId = facets['license_type'] ? Number(facets['license_type']) : undefined;
      const transactionType = facets['transaction_type'] || undefined;
      
      this.licensingService.getLedgerHistory(licenseTypeId, transactionType, search).subscribe({
        next: (res) => {
          this.data.set(res.data as any);
          this.total.set(res.data.length);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error:', err);
          this.loading.set(false);
        },
      });
    } else if (tab === 'types') {
      this.licensingService.listLicenseTypes(search).subscribe({
        next: (res) => {
          this.data.set(res.data as any);
          this.total.set(res.data.length);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error:', err);
          this.loading.set(false);
        },
      });
    } else if (tab === 'my-requests') {
      this.licensingService.listLicenseRequests(undefined, search).subscribe({
        next: (res) => {
          this.data.set(res.data as any);
          this.total.set(res.data.length);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error:', err);
          this.loading.set(false);
        },
      });
    } else if (tab === 'approve') {
      // Superadmin sees all requests
      this.licensingService.listLicenseRequests(undefined, search).subscribe({
        next: (res) => {
          this.data.set(res.data as any);
          this.total.set(res.data.length);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error:', err);
          this.loading.set(false);
        },
      });
    } else {
      // For any other tab, just clear data
      this.data.set([]);
      this.total.set(0);
      this.loading.set(false);
    }
  }

  onTabChange(key: string | null): void {
    if (key) {
      this.activeTab.set(key as any);
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab.set(tab as any);
  }

  onPrimaryActionClick(): void {
    const t = this.activeTab();
    if (t === 'types') {
      this.openCreateTypeModal();
    } else if (t === 'history') {
      this.openAdjustmentModal();
    }
  }

  onFiltersChange(filters: { search: string; facets: Record<string, string> }): void {
    this.searchQuery.set(filters.search);
    this.selectedFacets.set(filters.facets);
    this.fetchData(); // Refetch with new filters
  }

  onCellAction(event: { action: string; row: any }): void {
    const request = event.row as LicenseRequest;
    
    if (event.action === 'view') {
      this.viewRequestDetails(request);
    } else if (event.action === 'approve') {
      if (request.status !== 'pending') {
        this.toast.warning('Only pending requests can be approved');
        return;
      }
      this.approveRequest(request);
    } else if (event.action === 'reject') {
      if (request.status !== 'pending') {
        this.toast.warning('Only pending requests can be rejected');
        return;
      }
      this.rejectRequest(request);
    }
  }

  private viewRequestDetails(request: LicenseRequest): void {
    this.selectedRequest.set(request);
    this.showDetailsModal.set(true);
  }
  
  protected closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedRequest.set(null);
  }
  
  // Helper methods for template
  protected getTotalQuantity(request: LicenseRequest): number {
    return request.items.reduce((sum, item) => sum + item.quantity, 0);
  }
  
  protected getLicenseTypeName(licenseTypeId: number): string {
    return this.licenseTypes().find(t => t.id === licenseTypeId)?.name || 'Unknown License Type';
  }
  
  protected getLicenseTypeCategory(licenseTypeId: number): string {
    return this.licenseTypes().find(t => t.id === licenseTypeId)?.product_category || 'N/A';
  }
  
  protected getLicenseTypeTestType(licenseTypeId: number): string {
    return this.licenseTypes().find(t => t.id === licenseTypeId)?.test_type || 'N/A';
  }
  
  protected formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  private approveRequest(request: LicenseRequest): void {
    this.selectedRequest.set(request);
    this.showApproveModal.set(true);
  }
  
  protected closeApproveModal(): void {
    this.showApproveModal.set(false);
    this.selectedRequest.set(null);
  }
  
  protected handleApproveConfirm(): void {
    const request = this.selectedRequest();
    if (!request) return;

    this.submitting.set(true);
    this.licensingService.reviewLicenseRequest(request.id, { action: 'approve' }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeApproveModal();
        this.toast.success('Request approved successfully');
        this.fetchData(); // Refresh the list
      },
      error: (err) => {
        console.error('Error approving request:', err);
        this.toast.error(err.error?.message || 'Failed to approve request');
        this.submitting.set(false);
      },
    });
  }

  private rejectRequest(request: LicenseRequest): void {
    this.selectedRequest.set(request);
    this.rejectionReason.set('');
    this.showRejectModal.set(true);
  }
  
  protected closeRejectModal(): void {
    this.showRejectModal.set(false);
    this.selectedRequest.set(null);
    this.rejectionReason.set('');
  }
  
  protected handleRejectConfirm(): void {
    const request = this.selectedRequest();
    const reason = this.rejectionReason();
    
    if (!request || !reason.trim()) {
      this.toast.warning('Rejection reason is required');
      return;
    }

    this.submitting.set(true);
    this.licensingService.reviewLicenseRequest(request.id, { 
      action: 'reject',
      rejection_reason: reason 
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeRejectModal();
        this.toast.success('Request rejected');
        this.fetchData(); // Refresh the list
      },
      error: (err) => {
        console.error('Error rejecting request:', err);
        this.toast.error(err.error?.message || 'Failed to reject request');
        this.submitting.set(false);
      },
    });
  }

  // Create Type Modal
  openCreateTypeModal(): void {
    this.createTypeForm.reset();
    this.showCreateTypeModal.set(true);
  }

  closeCreateTypeModal(): void {
    this.showCreateTypeModal.set(false);
  }

  handleCreateTypeSubmit(): void {
    if (this.createTypeForm.invalid) {
      this.createTypeForm.markAllAsTouched();
      return;
    }

    const input: CreateLicenseTypeInput = this.createTypeForm.value;
    this.submitting.set(true);

    this.licensingService.createLicenseType(input).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeCreateTypeModal();
        this.toast.success('License type created successfully');
        this.fetchData();
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to create license type');
      },
    });
  }

  // Adjustment Modal
  openAdjustmentModal(): void {
    this.adjustmentForm.reset();
    this.showAdjustmentModal.set(true);
  }

  closeAdjustmentModal(): void {
    this.showAdjustmentModal.set(false);
  }

  handleAdjustmentSubmit(): void {
    if (this.adjustmentForm.invalid) {
      this.adjustmentForm.markAllAsTouched();
      return;
    }

    const input: ManualAdjustmentInput = this.adjustmentForm.value;
    this.submitting.set(true);

    this.licensingService.createAdjustment(input).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeAdjustmentModal();
        this.toast.success('License adjustment created successfully');
        this.fetchData();
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to create adjustment');
      },
    });
  }
}

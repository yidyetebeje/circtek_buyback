import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ColumnDef } from '@tanstack/angular-table';
import { GenericPageComponent, SelectFacet } from '../../../shared/components/generic-page/generic-page.component';
import { GenericModalComponent } from '../../../shared/components/generic-modal/generic-modal.component';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LicensingService, LicenseLedgerEntry, LicenseType, ManualAdjustmentInput } from '../../../services/licensing.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';

interface Tenant {
  id: number;
  name: string;
}

@Component({
  selector: 'app-license-ledger',
  imports: [CommonModule, GenericPageComponent, GenericModalComponent, ReactiveFormsModule],
  templateUrl: './license-ledger.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LicenseLedgerComponent {
  private readonly licensingService = inject(LicensingService);
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly ledgerEntries = signal<LicenseLedgerEntry[]>([]);
  protected readonly licenseTypes = signal<LicenseType[]>([]);
  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly showAdjustmentModal = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedLicenseTypeFilter = signal<number | null>(null);

  protected readonly isSuperAdmin = computed(() => 
    this.authService.currentUser()?.role_name === 'super_admin'
  );

  protected readonly adjustmentForm: FormGroup = this.fb.group({
    tenant_id: [null, [Validators.required]],
    license_type_id: [null, [Validators.required]],
    amount: [0, [Validators.required]],
    notes: ['', [Validators.required, Validators.maxLength(500)]],
  });

  protected readonly facets = computed(() => {
    const types = this.licenseTypes();
    const facets: SelectFacet[] = [];

    if (types.length > 0) {
      facets.push({
        key: 'license_type',
        label: 'License Type',
        type: 'select',
        options: [
          { label: 'All Types', value: '' },
          ...types.map(t => ({ label: t.name, value: t.id.toString() }))
        ],
      });
    }

    facets.push({
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

    return facets;
  });

  protected readonly columns: ColumnDef<LicenseLedgerEntry>[] = [
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: (info) => new Date(info.getValue() as string).toLocaleDateString(),
    },
    {
      accessorKey: 'transaction_type',
      header: 'Type',
      cell: (info) => {
        const type = info.getValue() as string;
        return type.charAt(0).toUpperCase() + type.slice(1);
      },
      meta: {
        cellClass: (row: LicenseLedgerEntry) => {
          const typeColors: Record<string, string> = {
            purchase: 'badge badge-success',
            usage: 'badge badge-warning',
            refund: 'badge badge-info',
            adjustment: 'badge badge-accent',
          };
          return typeColors[row.transaction_type] || '';
        },
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: (info) => {
        const amount = Number(info.getValue());
        return amount > 0 ? `+${amount}` : amount;
      },
      meta: {
        cellClass: (row: LicenseLedgerEntry) => {
          return row.amount > 0 ? 'text-success font-semibold' : 'text-error font-semibold';
        },
      },
    },
    {
      accessorKey: 'device_identifier',
      header: 'Device',
      cell: (info) => info.getValue() || 'N/A',
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: (info) => info.getValue() || 'N/A',
      meta: {
        truncateText: true,
        truncateMaxWidth: '300px',
      },
    },
  ];

  constructor() {
    this.loadLicenseTypes();
    this.loadLedger();
    if (this.isSuperAdmin()) {
      this.loadTenants();
    }
  }

  protected loadLicenseTypes(): void {
    this.licensingService.listLicenseTypes().subscribe({
      next: (response) => {
        this.licenseTypes.set(response.data);
      },
      error: (error) => {
        console.error('Error loading license types:', error);
      },
    });
  }

  protected loadTenants(): void {
    this.apiService.getTenants().subscribe({
      next: (response) => {
        this.tenants.set(response.data);
      },
      error: (error) => {
        console.error('Error loading tenants:', error);
      },
    });
  }

  protected loadLedger(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const licenseTypeId = this.selectedLicenseTypeFilter();
    this.licensingService.getLedgerHistory(licenseTypeId || undefined).subscribe({
      next: (response) => {
        this.ledgerEntries.set(response.data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading ledger:', error);
        this.errorMessage.set('Failed to load license history');
        this.loading.set(false);
      },
    });
  }

  protected handleFiltersChange(filters: { search: string; facets: Record<string, string> }): void {
    const licenseTypeId = filters.facets['license_type'] ? Number(filters.facets['license_type']) : null;
    this.selectedLicenseTypeFilter.set(licenseTypeId);
    this.loadLedger();
  }

  protected openAdjustmentModal(): void {
    if (!this.isSuperAdmin()) {
      this.errorMessage.set('Only superadmins can create adjustments');
      return;
    }
    this.adjustmentForm.reset({
      tenant_id: null,
      license_type_id: null,
      amount: 0,
      notes: '',
    });
    this.showAdjustmentModal.set(true);
  }

  protected closeAdjustmentModal(): void {
    this.showAdjustmentModal.set(false);
    this.adjustmentForm.reset();
  }

  protected handleAdjustmentSubmit(): void {
    if (this.adjustmentForm.invalid) {
      this.adjustmentForm.markAllAsTouched();
      return;
    }

    const formValue = this.adjustmentForm.value;
    const input: ManualAdjustmentInput = {
      tenant_id: Number(formValue.tenant_id),
      license_type_id: Number(formValue.license_type_id),
      amount: Number(formValue.amount),
      notes: formValue.notes,
    };

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.licensingService.createAdjustment(input).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.closeAdjustmentModal();
        this.loadLedger();
      },
      error: (error) => {
        console.error('Error creating adjustment:', error);
        this.errorMessage.set(error.error?.message || 'Failed to create adjustment');
        this.submitting.set(false);
      },
    });
  }

  protected getFieldError(fieldName: string): string | null {
    const control = this.adjustmentForm.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return `${fieldName} is required`;
    }
    if (control.errors['maxLength']) {
      return `Maximum length is ${control.errors['maxLength'].requiredLength}`;
    }
    return 'Invalid input';
  }
}

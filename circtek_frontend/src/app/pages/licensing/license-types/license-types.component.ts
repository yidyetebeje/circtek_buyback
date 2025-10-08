import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ColumnDef } from '@tanstack/angular-table';
import { GenericPageComponent } from '../../../shared/components/generic-page/generic-page.component';
import { GenericModalComponent } from '../../../shared/components/generic-modal/generic-modal.component';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LicensingService, LicenseType, CreateLicenseTypeInput } from '../../../services/licensing.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-license-types',
  imports: [CommonModule, GenericPageComponent, GenericModalComponent, ReactiveFormsModule],
  templateUrl: './license-types.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LicenseTypesComponent {
  private readonly licensingService = inject(LicensingService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly licenseTypes = signal<LicenseType[]>([]);
  protected readonly showCreateModal = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly isSuperAdmin = computed(() => 
    this.authService.currentUser()?.role_name === 'super_admin'
  );

  protected readonly createForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    product_category: ['', [Validators.required, Validators.maxLength(100)]],
    test_type: ['', [Validators.required, Validators.maxLength(100)]],
    price: [0, [Validators.required, Validators.min(0)]],
    description: ['', [Validators.maxLength(500)]],
  });

  protected readonly columns: ColumnDef<LicenseType>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'product_category',
      header: 'Product Category',
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'test_type',
      header: 'Test Type',
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: (info) => `$${Number(info.getValue()).toFixed(2)}`,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => info.getValue() || 'N/A',
      meta: {
        truncateText: true,
        truncateMaxWidth: '300px',
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => info.getValue() ? 'Active' : 'Inactive',
    },
  ];

  constructor() {
    this.loadLicenseTypes();
  }

  protected loadLicenseTypes(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.licensingService.listLicenseTypes().subscribe({
      next: (response) => {
        this.licenseTypes.set(response.data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading license types:', error);
        this.errorMessage.set('Failed to load license types');
        this.loading.set(false);
      },
    });
  }

  protected openCreateModal(): void {
    if (!this.isSuperAdmin()) {
      this.errorMessage.set('Only superadmins can create license types');
      return;
    }
    this.createForm.reset({
      name: '',
      product_category: '',
      test_type: '',
      price: 0,
      description: '',
    });
    this.showCreateModal.set(true);
  }

  protected closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createForm.reset();
  }

  protected handleCreateSubmit(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const formValue = this.createForm.value;
    const input: CreateLicenseTypeInput = {
      name: formValue.name,
      product_category: formValue.product_category,
      test_type: formValue.test_type,
      price: Number(formValue.price),
      description: formValue.description || undefined,
    };

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.licensingService.createLicenseType(input).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.closeCreateModal();
        this.loadLicenseTypes();
      },
      error: (error) => {
        console.error('Error creating license type:', error);
        this.errorMessage.set(error.error?.message || 'Failed to create license type');
        this.submitting.set(false);
      },
    });
  }

  protected getFieldError(fieldName: string): string | null {
    const control = this.createForm.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return `${fieldName} is required`;
    }
    if (control.errors['maxLength']) {
      return `Maximum length is ${control.errors['maxLength'].requiredLength}`;
    }
    if (control.errors['min']) {
      return `Minimum value is ${control.errors['min'].min}`;
    }
    return 'Invalid input';
  }
}

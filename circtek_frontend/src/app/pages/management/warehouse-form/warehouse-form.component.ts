import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFormPageComponent, type FormField, type FormAction } from '../../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ToastService } from '../../../core/services/toast.service';
import { Warehouse } from '../../../core/models/warehouse';
import { HttpParams } from '@angular/common/http';

@Component({
  selector: 'app-warehouse-form',
  imports: [CommonModule, GenericFormPageComponent, ReactiveFormsModule],
  templateUrl: './warehouse-form.component.html',
  styleUrls: ['./warehouse-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly toast = inject(ToastService);

  // State
  loading = signal(false);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  warehouseId = signal<number | null>(null);
  isEditMode = computed(() => this.warehouseId() !== null);
  
  // Options
  tenantOptions = signal<Array<{ label: string; value: number }>>([]);

  // Guards
  isSuperAdmin = computed(() => this.auth.currentUser()?.role_id === 1);

  // Form
  warehouseForm = signal<FormGroup>(this.createForm());

  // Computed values
  title = computed(() => this.isEditMode() ? 'Edit Warehouse' : 'Add Warehouse');
  subtitle = computed(() => this.isEditMode() ? 'Update warehouse information' : 'Create a new warehouse');
  submitLabel = computed(() => this.isEditMode() ? 'Update Warehouse' : 'Create Warehouse');

  fields = computed<FormField[]>(() => {
    const baseFields: FormField[] = [
      {
        key: 'name',
        label: 'Warehouse Name',
        type: 'text',
        placeholder: 'Enter warehouse name',
        required: true,
        validation: { minLength: 2, maxLength: 100 }
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Enter warehouse description',
        required: true,
        validation: { minLength: 10, maxLength: 500 }
      }
    ];

    if (this.isSuperAdmin()) {
      baseFields.push({
        key: 'tenant_id',
        label: 'Tenant',
        type: 'select',
        required: true,
        options: this.tenantOptions()
      });
    }

    baseFields.push({
      key: 'status',
      label: 'Active',
      type: 'checkbox',
      placeholder: 'Warehouse is active'
    });

    return baseFields;
  });

  actions = computed<FormAction[]>(() => [
    {
      label: 'Cancel',
      type: 'button',
      variant: 'ghost'
    },
  ]);

  constructor() {
    // Get warehouse ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !isNaN(Number(id))) {
      this.warehouseId.set(Number(id));
    }

    // Load options
    if (this.isSuperAdmin()) {
      this.loadTenantOptions();
    }

    // Load warehouse data if editing
    effect(() => {
      const warehouseId = this.warehouseId();
      if (warehouseId) {
        this.loadWarehouse(warehouseId);
      }
    });
  }

  // Custom validators
  private noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const isWhitespace = (value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { whitespace: true };
  }

  private createForm(): FormGroup {
    const formConfig: any = {
      name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        this.noWhitespaceValidator
      ]],
      description: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(500),
        this.noWhitespaceValidator
      ]],
      status: [true]
    };

    if (this.isSuperAdmin()) {
      formConfig.tenant_id = [null, [Validators.required]];
    }

    return this.fb.group(formConfig);
  }

  private loadTenantOptions() {
    // Only load active tenants
    this.api.getTenants(new HttpParams().set('limit', '1000').set('status', 'true')).subscribe({
      next: (res) => {
        const options = (res.data ?? [])
          .filter(tenant => tenant.status) // Additional client-side filter
          .map(tenant => ({
            label: tenant.name,
            value: tenant.id
          }));
        this.tenantOptions.set(options);
      },
      error: (error) => {
        console.error('Failed to load tenants:', error);
      }
    });
  }

  private loadWarehouse(warehouseId: number) {
    this.loading.set(true);
    this.api.getWarehouse(warehouseId).subscribe({
      next: (res) => {
        const warehouse = (res as any)?.data ?? (res as any);
        const formValue: any = {
          name: warehouse?.name ?? '',
          description: warehouse?.description ?? '',
          status: !!warehouse?.status,
        };

        if (this.isSuperAdmin()) {
          formValue.tenant_id = warehouse?.tenant_id ?? null;
        }

        // Recreate form with loaded data
        this.warehouseForm.set(this.createForm());
        this.warehouseForm().patchValue(formValue);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load warehouse:', error);
        this.loading.set(false);
        this.router.navigate(['/management'], { queryParams: { tab: 'warehouses' } });
      }
    });
  }

  onFormSubmit(formValue: any) {
    if (this.warehouseForm().invalid) {
      this.markAllFieldsAsTouched();
      return;
    }
    
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);
    
    // Trim all string values
    const warehouseData = { ...formValue };
    Object.keys(warehouseData).forEach(key => {
      if (typeof warehouseData[key] === 'string') {
        warehouseData[key] = warehouseData[key].trim();
      }
    });
    
    // Set tenant_id from current user if not super admin
    if (!this.isSuperAdmin()) {
      warehouseData.tenant_id = this.auth.currentUser()?.tenant_id;
    }

    if (this.isEditMode()) {
      this.api.updateWarehouse(this.warehouseId()!, warehouseData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.successMessage.set('Warehouse updated successfully.');
          this.toast.saveSuccess('Warehouse', 'updated');
          setTimeout(() => {
            this.router.navigate(['/management'], { queryParams: { tab: 'warehouses' } });
          }, 1200);
        },
        error: (error) => {
          console.error('Failed to update warehouse:', error);
          const msg = error?.error?.message || error?.message || 'Failed to update warehouse';
          this.errorMessage.set(msg);
          this.submitting.set(false);
        }
      });
    } else {
      this.api.createWarehouse(warehouseData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.successMessage.set('Warehouse created successfully.');
          this.toast.saveSuccess('Warehouse', 'created');
          setTimeout(() => {
            this.router.navigate(['/management'], { queryParams: { tab: 'warehouses' } });
          }, 1200);
        },
        error: (error) => {
          console.error('Failed to create warehouse:', error);
          const msg = error?.error?.message || error?.message || 'Failed to create warehouse';
          this.errorMessage.set(msg);
          this.submitting.set(false);
        }
      });
    }
  }

  onActionClick(event: { action: string; data?: any }) {
    if (event.action === 'Cancel') {
      this.router.navigate(['/management'], { queryParams: { tab: 'warehouses' } });
    }
  }
  
  private markAllFieldsAsTouched() {
    Object.keys(this.warehouseForm().controls).forEach(key => {
      this.warehouseForm().get(key)?.markAsTouched();
    });
  }
}

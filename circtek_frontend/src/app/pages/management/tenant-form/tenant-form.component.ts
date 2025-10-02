import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFormPageComponent, type FormField, type FormAction } from '../../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ToastService } from '../../../core/services/toast.service';
import type { Tenant } from '../../../core/models/tenant';

@Component({
  selector: 'app-tenant-form',
  imports: [CommonModule, GenericFormPageComponent, ReactiveFormsModule],
  templateUrl: './tenant-form.component.html',
  styleUrls: ['./tenant-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantFormComponent {
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
  tenantId = signal<number | null>(null);
  isEditMode = computed(() => this.tenantId() !== null);

  // Guards
  isSuperAdmin = computed(() => this.auth.currentUser()?.role_id === 1);

  // Form
  tenantForm = signal<FormGroup>(this.createForm());

  // Computed values
  title = computed(() => (this.isEditMode() ? 'Edit Tenant' : 'Add Tenant'));
  subtitle = computed(() => (this.isEditMode() ? 'Update tenant information' : 'Create a new tenant'));
  submitLabel = computed(() => (this.isEditMode() ? 'Update Tenant' : 'Create Tenant'));

  fields = computed<FormField[]>(() => [
    {
      key: 'name',
      label: 'Tenant Name',
      type: 'text',
      placeholder: 'Enter tenant name',
      required: true,
      validation: { minLength: 2, maxLength: 100 },
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Enter tenant description',
      required: true,
      validation: { minLength: 10, maxLength: 500 },
    },
    {
      key: 'status',
      label: 'Active',
      type: 'checkbox',
      placeholder: 'Tenant is active',
    },
    {
      key: 'logo',
      label: 'Logo',
      type: 'file',
      placeholder: 'Upload logo',
      accept: 'image/*,.jpg,.jpeg,.png,.gif,.webp,.svg',
      maxSize: 10 * 1024 * 1024, // 10MB
      folder: 'tenants/logos',
      helpText: 'Accepted formats: JPG, PNG, GIF, WebP, SVG. Maximum size: 10 MB',
    },
  ]);

  actions = computed<FormAction[]>(() => [
    {
      label: 'Cancel',
      type: 'button',
      variant: 'ghost',
    },
  ]);

  constructor() {
    // Guard access: super_admin only
    if (!this.isSuperAdmin()) {
      this.router.navigate(['/management']);
      return;
    }

    // Get tenant ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !isNaN(Number(id))) {
      this.tenantId.set(Number(id));
    }

    // Load tenant data if editing
    effect(() => {
      const tid = this.tenantId();
      if (tid) {
        this.loadTenant(tid);
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
    return this.fb.group({
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
      status: [true],
      logo: [''],
    });
  }

  private loadTenant(tenantId: number) {
    this.loading.set(true);
    // Prefer router state if available
    const s: any = history.state?.data as Tenant | undefined;
    if (s && typeof s === 'object') {
      this.tenantForm.set(this.createForm());
      this.tenantForm().patchValue({
        name: s.name ?? '',
        description: s.description ?? '',
        status: !!s.status,
        logo: s.logo ?? '',
      });
      this.loading.set(false);
      return;
    }

    this.api.getTenant(tenantId).subscribe({
      next: (res) => {
        const t = res.data;
        if (t) {
          this.tenantForm.set(this.createForm());
          this.tenantForm().patchValue({
            name: t.name ?? '',
            description: t.description ?? '',
            status: !!t.status,
            logo: t.logo ?? '',
          });
        } else {
          // If not found, navigate back
          this.router.navigate(['/management'], { queryParams: { tab: 'tenants' } });
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/management'], { queryParams: { tab: 'tenants' } });
      },
    });
  }

  onFormSubmit(formValue: any) {
    if (this.tenantForm().invalid) {
      this.markAllFieldsAsTouched();
      return;
    }
    
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);

    // Trim all string values and remove logo if empty/null
    const tenantData = { ...formValue };
    Object.keys(tenantData).forEach(key => {
      if (typeof tenantData[key] === 'string') {
        tenantData[key] = tenantData[key].trim();
      }
    });

    // Remove logo field if it's empty or null
    if (!tenantData.logo || tenantData.logo === '') {
      delete tenantData.logo;
    }

    if (this.isEditMode()) {
      this.api.updateTenant(this.tenantId()!, tenantData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.successMessage.set('Tenant updated successfully.');
          this.toast.saveSuccess('Tenant', 'updated');
          setTimeout(() => {
            this.router.navigate(['/management'], { queryParams: { tab: 'tenants' } });
          }, 1200);
        },
        error: (error) => {
          const msg = error?.error?.message || error?.message || 'Failed to update tenant';
          this.errorMessage.set(msg);
          this.submitting.set(false);
        },
      });
    } else {
      this.api.createTenant(tenantData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.successMessage.set('Tenant created successfully.');
          this.toast.saveSuccess('Tenant', 'created');
          setTimeout(() => {
            this.router.navigate(['/management'], { queryParams: { tab: 'tenants' } });
          }, 1200);
        },
        error: (error) => {
          const msg = error?.error?.message || error?.message || 'Failed to create tenant';
          this.errorMessage.set(msg);
          this.submitting.set(false);
        },
      });
    }
  }

  onActionClick(event: { action: string; data?: any }) {
    if (event.action === 'Cancel') {
      this.router.navigate(['/management'], { queryParams: { tab: 'tenants' } });
    }
  }
  
  private markAllFieldsAsTouched() {
    Object.keys(this.tenantForm().controls).forEach(key => {
      this.tenantForm().get(key)?.markAsTouched();
    });
  }
}

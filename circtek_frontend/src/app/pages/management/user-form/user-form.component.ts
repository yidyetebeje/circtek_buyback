import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFormPageComponent, type FormField, type FormAction } from '../../../shared/components/generic-form-page/generic-form-page.component';
import { GenericModalComponent, type ModalAction } from '../../../shared/components/generic-modal/generic-modal.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ToastService } from '../../../core/services/toast.service';
import { User } from '../../../core/models/user';
import { HttpParams } from '@angular/common/http';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-form',
  imports: [CommonModule, GenericFormPageComponent, ReactiveFormsModule, GenericModalComponent],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormComponent {
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
  userId = signal<number | null>(null);
  showConfirmModal = signal(false);
  pendingFormData = signal<any>(null);
  isEditMode = computed(() => this.userId() !== null);

  // Loading states for different components
  tenantsLoading = signal(false);
  warehousesLoading = signal(false);

  // Error states for different components
  tenantsError = signal<string | null>(null);
  warehousesError = signal<string | null>(null);

  // Computed loading state - page loading until tenants are loaded (for super admin)
  pageLoading = computed(() => {
    if (this.isSuperAdmin()) {
      return this.loading() || this.tenantsLoading();
    }
    return this.loading();
  });

  // Ensure the tenant control exists (added when user becomes super admin after async auth load)
  private ensureTenantControlExists() {
    const form = this.userForm();
    if (!form.get('tenant_id')) {
      form.addControl('tenant_id', new FormControl<number | null>(null, [Validators.required]));
    }
  }

  // Attach or reattach subscription to tenant selection changes
  private attachTenantValueChangesSubscription() {
    // Cleanup previous subscription to avoid duplicates
    if (this.tenantValueChangesSub) {
      this.tenantValueChangesSub.unsubscribe();
      this.tenantValueChangesSub = null;
    }

    const tenantControl = this.userForm().get('tenant_id');
    if (!tenantControl) return;

    this.tenantValueChangesSub = tenantControl.valueChanges.subscribe((tenantId: number | null) => {
      // Update selected tenant signal for reactivity
      this.selectedTenantId.set(tenantId || null);

      // Clear any warehouse errors when tenant changes
      this.warehousesError.set(null);
      // Reset selected warehouse when tenant changes
      this.userForm().patchValue({ warehouse_id: null }, { emitEvent: false });

      // Update warehouse field validation based on tenant selection
      this.updateWarehouseFieldValidation();

      // Only load warehouses if a tenant is selected
      if (tenantId) {
        this.loadWarehousesForTenant(tenantId);
      } else {
        // Clear warehouses if no tenant is selected
        this.warehouseOptions.set([]);
        this.warehousesLoading.set(false);
      }
    });
  }

  // Show message when tenant is selected but no warehouses are available
  showNoWarehousesMessage = computed(() => {
    const tenantSelected = this.isSuperAdmin() ? !!this.selectedTenantId() : true;
    return tenantSelected &&
      !this.warehousesLoading() &&
      !this.warehousesError() &&
      this.warehouseOptions().length === 0;
  });

  // Options
  roleOptions = signal<Array<{ label: string; value: number }>>([]);
  tenantOptions = signal<Array<{ label: string; value: number }>>([]);
  warehouseOptions = signal<Array<{ label: string; value: number }>>([]);

  // Track selected tenant for reactivity
  selectedTenantId = signal<number | null>(null);

  // Subscriptions
  private tenantValueChangesSub: Subscription | null = null;

  // Guards
  isSuperAdmin = computed(() => this.auth.currentUser()?.role_id === 1);

  // Form
  userForm = signal<FormGroup>(this.createForm());

  // Computed values
  title = computed(() => this.isEditMode() ? 'Edit User' : 'Add User');
  subtitle = computed(() => this.isEditMode() ? 'Update user information' : 'Create a new user account');
  submitLabel = computed(() => this.isEditMode() ? 'Update User' : 'Create User');

  // Modal actions
  confirmModalActions = computed<ModalAction[]>(() => [
    { label: 'Cancel', variant: 'ghost', action: 'cancel' },
    { label: 'Yes, Update', variant: 'primary', action: 'confirm', loading: this.submitting() }
  ]);

  fields = computed<FormField[]>(() => {
    const fields: FormField[] = [
      {
        key: 'name',
        label: 'Full Name',
        type: 'text',
        placeholder: 'Enter full name',
        required: true,
        validation: { minLength: 2, maxLength: 100 }
      },
      {
        key: 'user_name',
        label: 'Username',
        type: 'text',
        placeholder: 'Enter username',
        required: true,
        validation: { minLength: 3, maxLength: 50 }
      },
      {
        key: 'role_id',
        label: 'Role',
        type: 'select',
        required: true,
        options: this.roleOptions()
      }
    ];

    fields.push({
      key: 'password',
      label: this.isEditMode() ? 'New Password' : 'Password',
      type: 'password',
      placeholder: this.isEditMode() ? 'Enter new password (leave blank to keep current)' : 'Enter password',
      required: !this.isEditMode(),
      validation: { minLength: 8 }
    });

    if (this.isSuperAdmin()) {
      fields.push({
        key: 'tenant_id',
        label: 'Tenant',
        type: 'select',
        required: true,
        options: this.tenantOptions()
      });
    }

    // Include Warehouse field (tenant-scoped for non-super_admin, conditional for super_admin)
    const shouldShowWarehouse = this.isSuperAdmin()
      ? !!this.selectedTenantId() // For super admin, only show if tenant is selected
      : true; // For non-super admin, always show

    if (shouldShowWarehouse) {
      fields.push({
        key: 'warehouse_id',
        label: 'Warehouse',
        type: 'select',
        required: true,
        options: this.warehouseOptions()
      });
    }

    fields.push({
      key: 'status',
      label: 'Active',
      type: 'checkbox',
      placeholder: 'User is active'
    });

    return fields;
  });

  actions = computed<FormAction[]>(() => [
    {
      label: 'Cancel',
      type: 'button',
      variant: 'ghost'
    }
  ]);

  constructor() {
    // Get user ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !isNaN(Number(id))) {
      this.userId.set(Number(id));
    }

    // Load options
    this.loadRoleOptions();
    if (this.isSuperAdmin()) {
      // Ensure tenant control exists and subscribe safely
      this.ensureTenantControlExists();
      if (this.tenantOptions().length === 0 && !this.tenantsLoading()) {
        this.loadTenantOptions();
      }
      this.attachTenantValueChangesSubscription();
    } else {
      // Non super_admin: load warehouses for current tenant
      this.loadWarehousesForTenant();
    }

    // Load user data if editing
    effect(() => {
      const userId = this.userId();
      if (userId) {
        this.loadUser(userId);
      }
    });

    // React when currentUser arrives asynchronously or when the form is recreated
    effect(() => {
      const superAdmin = this.isSuperAdmin();
      // Track form identity to reattach subscriptions after form recreation
      this.userForm();
      if (superAdmin) {
        this.ensureTenantControlExists();
        if (this.tenantOptions().length === 0 && !this.tenantsLoading()) {
          this.loadTenantOptions();
        }
        this.attachTenantValueChangesSubscription();
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

  private strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const isValidLength = value.length >= 8;
    const noWhitespace = !/\s/.test(value);

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar && isValidLength && noWhitespace;

    if (!passwordValid) {
      return {
        strongPassword: {
          hasUpperCase,
          hasLowerCase,
          hasNumeric,
          hasSpecialChar,
          isValidLength,
          noWhitespace
        }
      };
    }

    return null;
  }

  // Note: Username uniqueness validation would require a backend endpoint
  // For now, we'll rely on backend validation and show server errors

  private createForm(): FormGroup {
    // Allows letters (including accents), spaces, apostrophes, hyphens, and periods.
    // Disallows whitespace-only names.
    const NAME_REGEX = /^(?!\s*$)[A-Za-zÀ-ÖØ-öø-ÿ' .-]+$/;

    const formConfig: any = {
      name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        Validators.pattern(NAME_REGEX),
        this.noWhitespaceValidator
      ]],
      user_name: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        this.noWhitespaceValidator
      ]],
      role_id: [null, [Validators.required]],
      warehouse_id: [null], // Will be set as required conditionally
      status: [true]
    };

    const passwordValidators = this.isEditMode()
      ? [this.strongPasswordValidator]
      : [Validators.required, this.strongPasswordValidator];
    formConfig.password = ['', passwordValidators];

    if (this.isSuperAdmin()) {
      formConfig.tenant_id = [null, [Validators.required]];
    }

    const form = this.fb.group(formConfig);

    // Set warehouse field validation based on current state
    setTimeout(() => {
      this.updateWarehouseFieldValidation();
    }, 0);

    return form;
  }

  /**
   * Transforms a role name from snake_case to Title Case.
   * Example: 'super_admin' -> 'Super Admin'
   */
  private formatRoleName(name: string): string {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private loadRoleOptions() {
    this.api.getRoles(new HttpParams().set('limit', '1000')).subscribe({
      next: (res) => {
        let roles = res.data ?? [];
        // Filter out super_admin role for all users
        roles = roles.filter(role => role.name !== 'super_admin');
        const options = roles.map(role => ({ label: this.formatRoleName(role.name), value: role.id }));
        this.roleOptions.set(options);
      },
      error: () => {
        // Fallback when /roles is forbidden
        // Use real IDs per seed order: 1=super_admin, 2=admin, 3=tester, 4=repair_manager, 5=repair_technician, 6=stock_manager
        const fallback = [
          { name: 'admin', id: 2 },
          { name: 'tester', id: 3 },
          { name: 'repair_manager', id: 4 },
          { name: 'repair_technician', id: 5 },
          { name: 'stock_manager', id: 6 },
        ];
        this.roleOptions.set(fallback.map(r => ({ label: this.formatRoleName(r.name), value: r.id })));
      }
    });
  }

  loadTenantOptions() {
    this.tenantsLoading.set(true);
    this.tenantsError.set(null);

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
        this.tenantsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load tenants:', error);
        const errorMsg = error?.error?.message || error?.message || 'Failed to load tenants. Please try again.';
        this.tenantsError.set(errorMsg);
        this.tenantsLoading.set(false);
      }
    });
  }

  private updateWarehouseFieldValidation() {
    const warehouseControl = this.userForm().get('warehouse_id');
    if (!warehouseControl) return;

    const shouldRequireWarehouse = this.isSuperAdmin()
      ? !!this.selectedTenantId()
      : true;

    if (shouldRequireWarehouse) {
      warehouseControl.setValidators([Validators.required]);
    } else {
      warehouseControl.clearValidators();
      warehouseControl.setValue(null); // Clear value when not required
    }
    warehouseControl.updateValueAndValidity();
  }

  loadWarehousesForTenant(tenantId?: number | null) {
    this.warehousesLoading.set(true);
    this.warehousesError.set(null);

    // Update warehouse field validation
    this.updateWarehouseFieldValidation();

    // Clear existing warehouses when loading
    this.warehouseOptions.set([]);

    let params = new HttpParams().set('limit', '1000').set('status', 'true');
    if (this.isSuperAdmin() && tenantId) {
      params = params.set('tenant_id', String(tenantId));
    }

    this.api.getWarehouses(params).subscribe({
      next: (res) => {
        const options = (res.data ?? [])
          .filter(warehouse => warehouse.status) // Additional client-side filter
          .map(w => ({ label: w.name, value: w.id }));
        this.warehouseOptions.set(options);
        this.warehousesLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load warehouses:', error);
        const errorMsg = error?.error?.message || error?.message || 'Failed to load warehouses. Please try again.';
        this.warehousesError.set(errorMsg);
        this.warehouseOptions.set([]);
        this.warehousesLoading.set(false);
      }
    });
  }

  private loadUser(userId: number) {
    this.loading.set(true);
    this.api.getUser(userId).subscribe({
      next: (res) => {
        // Support both raw User and ApiResponse<User> shapes
        const user = (res as any)?.data ?? (res as any);
        const formValue = {
          name: user?.name ?? '',
          user_name: user?.user_name ?? '',
          role_id: user?.role_id ?? null,
          warehouse_id: user?.warehouse_id ?? null,
          status: !!user?.status
        } as any;

        if (this.isSuperAdmin()) {
          formValue.tenant_id = user?.tenant_id ?? null;
          // Update selected tenant signal
          this.selectedTenantId.set(formValue.tenant_id);
          // Ensure warehouse options are loaded for the user's tenant before patching
          if (formValue.tenant_id) {
            this.loadWarehousesForTenant(formValue.tenant_id);
          }
        }

        // Recreate form with loaded data
        this.userForm.set(this.createForm());
        this.userForm().patchValue(formValue);

        // Update warehouse field validation after patching data
        setTimeout(() => {
          this.updateWarehouseFieldValidation();
        }, 0);

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load user:', error);
        this.loading.set(false);
        this.router.navigate(['/management'], { queryParams: { tab: 'users' } });
      }
    });
  }

  onFormSubmit(formValue: any) {
    if (this.userForm().invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    // Trim all string values
    const userData = { ...formValue };
    Object.keys(userData).forEach(key => {
      if (typeof userData[key] === 'string') {
        userData[key] = userData[key].trim();
      }
    });

    if (this.isEditMode() && !userData.password) {
      delete userData.password;
    }

    // For edit mode, show confirmation modal
    if (this.isEditMode()) {
      this.pendingFormData.set(userData);
      this.showConfirmModal.set(true);
      return;
    }

    // For create mode, proceed directly
    this.submitForm(userData);
  }

  private markAllFieldsAsTouched() {
    Object.keys(this.userForm().controls).forEach(key => {
      this.userForm().get(key)?.markAsTouched();
    });
  }

  onConfirmModalAction(action: string) {
    if (action === 'confirm') {
      const userData = this.pendingFormData();
      if (userData) {
        this.submitForm(userData);
      }
    }
    this.showConfirmModal.set(false);
    this.pendingFormData.set(null);
  }

  private submitForm(userData: any) {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);

    // Set tenant_id from current user if not super admin
    if (!this.isSuperAdmin()) {
      userData.tenant_id = this.auth.currentUser()?.tenant_id;
    }

    if (this.isEditMode()) {
      this.api.updateUser(this.userId()!, userData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.successMessage.set('User updated successfully.');
          this.toast.saveSuccess('User', 'updated');
          // Navigate after a short delay so the success is visible
          setTimeout(() => {
            this.router.navigate(['/management'], { queryParams: { tab: 'users' } });
          }, 1200);
        },
        error: (error) => {
          console.error('Failed to update user:', error);
          let msg = error?.error?.message || error?.message || 'Failed to update user';

          // Check for 409 status code (username already taken)
          if (error?.status === 409 || error?.error?.status === 409) {
            msg = 'Username already taken. Please choose a different username.';
          }

          this.errorMessage.set(msg);
          this.submitting.set(false);
        }
      });
    } else {
      this.api.createUser(userData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.successMessage.set('User created successfully.');
          this.toast.saveSuccess('User', 'created');
          setTimeout(() => {
            this.router.navigate(['/management'], { queryParams: { tab: 'users' } });
          }, 1200);
        },
        error: (error) => {
          console.error('Failed to create user:', error);
          let msg = error?.error?.message || error?.message || 'Failed to create user';

          // Check for 409 status code (username already taken)
          if (error?.status === 409 || error?.error?.status === 409) {
            msg = 'Username already taken. Please choose a different username.';
          }

          this.errorMessage.set(msg);
          this.submitting.set(false);
        }
      });
    }
  }

  onActionClick(event: { action: string; data?: any }) {
    if (event.action === 'Cancel') {
      this.navigateBack();
    }
  }

  onBackClick(): void {
    this.navigateBack();
  }

  private navigateBack(): void {
    this.router.navigate(['/management'], { queryParams: { tab: 'users' } });
  }
}

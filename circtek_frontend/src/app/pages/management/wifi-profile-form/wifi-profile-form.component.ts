import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFormPageComponent, type FormField, type FormAction } from '../../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ToastService } from '../../../core/services/toast.service';
import { WiFiProfile } from '../../../core/models/wifi-profile';
import { HttpParams } from '@angular/common/http';

@Component({
  selector: 'app-wifi-profile-form',
  imports: [CommonModule, GenericFormPageComponent, ReactiveFormsModule],
  templateUrl: './wifi-profile-form.component.html',
  styleUrls: ['./wifi-profile-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WiFiProfileFormComponent {
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
  wifiProfileId = signal<number | null>(null);
  isEditMode = computed(() => this.wifiProfileId() !== null);
  
  // Options
  tenantOptions = signal<Array<{ label: string; value: number }>>([]);

  // Guards
  isSuperAdmin = computed(() => this.auth.currentUser()?.role_id === 1);

  // Form
  wifiProfileForm = signal<FormGroup>(this.createForm());

  // Computed values
  title = computed(() => this.isEditMode() ? 'Edit WiFi Profile' : 'Add WiFi Profile');
  subtitle = computed(() => this.isEditMode() ? 'Update WiFi profile information' : 'Create a new WiFi profile');
  submitLabel = computed(() => this.isEditMode() ? 'Update WiFi Profile' : 'Create WiFi Profile');

  fields = computed<FormField[]>(() => {
    const baseFields: FormField[] = [];

    // Tenant selection only for super_admin and only on create
    if (this.isSuperAdmin() && !this.isEditMode()) {
      baseFields.push({
        key: 'tenant_id',
        label: 'Tenant',
        type: 'select',
        required: true,
        options: this.tenantOptions()
      });
    }

    baseFields.push(
      {
        key: 'name',
        label: 'Profile Name',
        type: 'text',
        placeholder: 'Enter profile name',
        required: true,
        validation: { minLength: 2, maxLength: 100 }
      },
      {
        key: 'ssid',
        label: 'SSID',
        type: 'text',
        placeholder: 'Enter WiFi network name (SSID)',
        required: true,
        validation: { minLength: 1, maxLength: 32 }
      },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        placeholder: this.isEditMode() ? 'Leave blank to keep existing password' : 'Enter WiFi password',
        required: !this.isEditMode(),
        autocomplete: 'off',
        validation: { minLength: 8, maxLength: 63 },
        helpText: this.isEditMode() ? 'Only enter a new password if you want to change it' : undefined
      },
      {
        key: 'status',
        label: 'Active',
        type: 'checkbox',
        placeholder: 'WiFi profile is active'
      }
    );

    return baseFields;
  });

  actions = computed<FormAction[]>(() => [
    {
      label: 'Cancel',
      type: 'button',
      variant: 'ghost'
    }
  ]);

  constructor() {
    // Get WiFi profile ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !isNaN(Number(id))) {
      this.wifiProfileId.set(Number(id));
    }

    // Load tenant options for super admins on create mode
    effect(() => {
      const superAdmin = this.isSuperAdmin();
      const isEdit = this.isEditMode();
      if (superAdmin && !isEdit && this.tenantOptions().length === 0) {
        this.loadTenantOptions();
      }
    });

    // Load WiFi profile data if editing
    effect(() => {
      const wifiProfileId = this.wifiProfileId();
      if (wifiProfileId) {
        this.loadWiFiProfile(wifiProfileId);
      }
    });
  }

  private createForm(): FormGroup {
    const formConfig: any = {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      ssid: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(32)]],
      // On edit, password should be optional (leave blank to keep existing)
      password: ['', this.isEditMode() ? [Validators.minLength(8), Validators.maxLength(63)] : [Validators.required, Validators.minLength(8), Validators.maxLength(63)]],
      status: [true]
    };

    // Only add tenant_id for super_admin on create mode
    if (this.isSuperAdmin() && !this.isEditMode()) {
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

  private loadWiFiProfile(wifiProfileId: number) {
    this.loading.set(true);
    this.api.getWifiProfile(wifiProfileId).subscribe({
      next: (res) => {
        const wifiProfile = (res as any)?.data ?? (res as any);
        const formValue: any = {
          name: wifiProfile?.name ?? '',
          ssid: wifiProfile?.ssid ?? '',
          password: '', // Leave empty - user can enter new password if they want to change it
          status: !!wifiProfile?.status
        };

        // Don't include tenant_id in edit mode - it's not editable

        // Recreate form with loaded data (password optional in edit mode)
        this.wifiProfileForm.set(this.createForm());
        this.wifiProfileForm().patchValue(formValue);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load WiFi profile:', error);
        this.loading.set(false);
        this.router.navigate(['/management'], { queryParams: { tab: 'wifi' } });
      }
    });
  }

  onFormSubmit(formValue: any) {
    if (this.wifiProfileForm().invalid) return;
    this.errorMessage.set(null);
    this.submitting.set(true);
    
    const wifiProfileData = { ...formValue };

    // In edit mode, if password left blank, omit it to keep existing password
    if (this.isEditMode() && (!wifiProfileData.password || String(wifiProfileData.password).trim() === '')) {
      delete (wifiProfileData as any).password;
    }
    
    // Set tenant_id from current user if not super admin (only for create)
    if (!this.isEditMode() && !this.isSuperAdmin()) {
      wifiProfileData.tenant_id = this.auth.currentUser()?.tenant_id;
    }
    
    // Remove tenant_id in edit mode (not editable)
    if (this.isEditMode()) {
      delete (wifiProfileData as any).tenant_id;
    }

    if (this.isEditMode()) {
      this.api.updateWifiProfile(this.wifiProfileId()!, wifiProfileData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.saveSuccess('WiFi Profile', 'updated');
          this.router.navigate(['/management'], { queryParams: { tab: 'wifi' } });
        },
        error: (error) => {
          console.error('Failed to update WiFi profile:', error);
          const msg = error?.error?.message || error?.message || 'Failed to update WiFi profile';
          this.errorMessage.set(msg);
          this.submitting.set(false);
        }
      });
    } else {
      this.api.createWifiProfile(wifiProfileData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.saveSuccess('WiFi Profile', 'created');
          this.router.navigate(['/management'], { queryParams: { tab: 'wifi' } });
        },
        error: (error) => {
          console.error('Failed to create WiFi profile:', error);
          const msg = error?.error?.message || error?.message || 'Failed to create WiFi profile';
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
    this.router.navigate(['/management'], { queryParams: { tab: 'wifi' } });
  }
}

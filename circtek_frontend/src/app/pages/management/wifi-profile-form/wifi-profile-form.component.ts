import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFormPageComponent, type FormField, type FormAction } from '../../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
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
    const baseFields: FormField[] = [
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
        placeholder: 'Enter WiFi password',
        required: true,
        validation: { minLength: 8, maxLength: 63 }
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
      placeholder: 'WiFi profile is active'
    });

    return baseFields;
  });

  actions = computed<FormAction[]>(() => [
    {
      label: 'Cancel',
      type: 'button',
      variant: 'ghost'
    },
    {
      label: this.isEditMode() ? 'Update WiFi Profile' : 'Create WiFi Profile',
      type: 'submit',
      variant: 'primary',
      icon: this.isEditMode() ? 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10' : 'M12 4.5v15m7.5-7.5h-15'
    }
  ]);

  constructor() {
    // Get WiFi profile ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !isNaN(Number(id))) {
      this.wifiProfileId.set(Number(id));
    }

    // Load options
    if (this.isSuperAdmin()) {
      this.loadTenantOptions();
    }

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
      password: ['', this.isEditMode() ? [] : [Validators.required, Validators.minLength(8), Validators.maxLength(63)]],
      status: [true]
    };

    if (this.isSuperAdmin()) {
      formConfig.tenant_id = [null, [Validators.required]];
    }

    return this.fb.group(formConfig);
  }

  private loadTenantOptions() {
    this.api.getTenants(new HttpParams().set('limit', '1000')).subscribe({
      next: (res) => {
        const options = (res.data ?? []).map(tenant => ({
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
          // Do not patch password on edit for security; leave empty to keep existing
          status: !!wifiProfile?.status
        };

        if (this.isSuperAdmin()) {
          formValue.tenant_id = wifiProfile?.tenant_id ?? null;
        }

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
    
    // Set tenant_id from current user if not super admin
    if (!this.isSuperAdmin()) {
      wifiProfileData.tenant_id = this.auth.currentUser()?.tenant_id;
    }

    if (this.isEditMode()) {
      this.api.updateWifiProfile(this.wifiProfileId()!, wifiProfileData).subscribe({
        next: () => {
          this.submitting.set(false);
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
      this.router.navigate(['/management'], { queryParams: { tab: 'wifi' } });
    }
  }
}

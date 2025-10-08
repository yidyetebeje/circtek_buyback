import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LicensingService, LicenseType } from '../../../services/licensing.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideAngularModule, Plus, Trash2, ArrowLeft, Zap } from 'lucide-angular';

interface Tenant {
  id: number;
  name: string;
}

@Component({
  selector: 'app-quick-grant',
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './quick-grant.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickGrantComponent {
  private readonly fb = inject(FormBuilder);
  private readonly licensingService = inject(LicensingService);
  private readonly apiService = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  // Icons
  protected readonly PlusIcon = Plus;
  protected readonly TrashIcon = Trash2;
  protected readonly ArrowLeftIcon = ArrowLeft;
  protected readonly ZapIcon = Zap;

  loading = signal(false);
  submitting = signal(false);
  licenseTypes = signal<LicenseType[]>([]);
  tenants = signal<Tenant[]>([]);

  grantForm: FormGroup = this.fb.group({
    tenant_id: [null, Validators.required],
    grants: this.fb.array([]),
    notes: ['', Validators.required],
  });

  get grants(): FormArray {
    return this.grantForm.get('grants') as FormArray;
  }

  constructor() {
    // Load license types
    this.licensingService.listLicenseTypes().subscribe({
      next: (res) => {
        this.licenseTypes.set(res.data);
        // Add initial row
        if (this.grants.length === 0) {
          this.addGrantRow();
        }
      },
      error: (err) => {
        console.error('Error loading license types:', err);
        this.toast.error('Failed to load license types');
      },
    });

    // Load tenants
    this.apiService.getTenants().subscribe({
      next: (res) => {
        this.tenants.set(res.data);
      },
      error: (err) => {
        console.error('Error loading tenants:', err);
        this.toast.error('Failed to load tenants');
      },
    });
  }

  addGrantRow(): void {
    const row = this.fb.group({
      license_type_id: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });
    this.grants.push(row);
  }

  removeGrantRow(index: number): void {
    if (this.grants.length > 1) {
      this.grants.removeAt(index);
    } else {
      this.toast.warning('You must have at least one license type');
    }
  }

  onSubmit(): void {
    if (this.grantForm.invalid) {
      this.grantForm.markAllAsTouched();
      this.toast.error('Please fill in all required fields');
      return;
    }

    this.submitting.set(true);
    const formValue = this.grantForm.value;

    this.licensingService.quickGrant(formValue).subscribe({
      next: () => {
        this.toast.success('Licenses granted successfully');
        this.submitting.set(false);
        this.router.navigate(['/licensing'], { queryParams: { tab: 'approve' } });
      },
      error: (err) => {
        console.error('Error granting licenses:', err);
        this.toast.error(err.error?.message || 'Failed to grant licenses');
        this.submitting.set(false);
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/licensing'], { queryParams: { tab: 'approve' } });
  }
}

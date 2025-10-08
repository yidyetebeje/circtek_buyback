import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LicensingService, LicenseType } from '../../../services/licensing.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideAngularModule, Plus, Trash2, ArrowLeft, Send } from 'lucide-angular';

@Component({
  selector: 'app-request-licenses',
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './request-licenses.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestLicensesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly licensingService = inject(LicensingService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  // Icons
  protected readonly PlusIcon = Plus;
  protected readonly TrashIcon = Trash2;
  protected readonly ArrowLeftIcon = ArrowLeft;
  protected readonly SendIcon = Send;

  loading = signal(false);
  submitting = signal(false);
  licenseTypes = signal<LicenseType[]>([]);

  requestForm: FormGroup = this.fb.group({
    items: this.fb.array([]),
  });

  get items(): FormArray {
    return this.requestForm.get('items') as FormArray;
  }

  constructor() {
    // Load license types
    this.licensingService.listLicenseTypes().subscribe({
      next: (res) => {
        this.licenseTypes.set(res.data);
        // Add initial row
        if (this.items.length === 0) {
          this.addLicenseRow();
        }
      },
      error: (err) => {
        console.error('Error loading license types:', err);
        this.toast.error('Failed to load license types');
      },
    });
  }

  addLicenseRow(): void {
    const row = this.fb.group({
      license_type_id: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });
    this.items.push(row);
  }

  removeLicenseRow(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    } else {
      this.toast.warning('You must have at least one license type');
    }
  }

  getLicenseTypeName(id: number): string {
    const type = this.licenseTypes().find(t => t.id === id);
    return type ? `${type.name} - $${type.price}` : '';
  }

  onSubmit(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      this.toast.error('Please fill in all required fields');
      return;
    }

    this.submitting.set(true);
    const formValue = this.requestForm.value;

    // Transform items to include empty justification (backend requires it)
    const items = formValue.items.map((item: any) => ({
      license_type_id: item.license_type_id,
      quantity: item.quantity,
      justification: '', // Empty as per requirement
    }));

    this.licensingService.createLicenseRequest({ items }).subscribe({
      next: () => {
        this.toast.success('License request submitted successfully');
        this.submitting.set(false);
        this.router.navigate(['/licensing'], { queryParams: { tab: 'my-requests' } });
      },
      error: (err) => {
        console.error('Error submitting request:', err);
        this.toast.error(err.error?.message || 'Failed to submit request');
        this.submitting.set(false);
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/licensing'], { queryParams: { tab: 'my-requests' } });
  }
}

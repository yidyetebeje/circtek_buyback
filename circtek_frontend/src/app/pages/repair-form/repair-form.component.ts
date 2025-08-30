import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';

import { GenericFormPageComponent, type FormField, type FormAction } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { RepairCreateInput } from '../../core/models/repair';

interface RepairFormData {
  device_id: number;
  device_sku: string;
  reason_id: number;
  remarks?: string;
  actor_id: number;
}

@Component({
  selector: 'app-repair-form',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent],
  templateUrl: './repair-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepairFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  // State
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);

  // Form
  form = this.fb.group({
    device_id: [0, [Validators.required, Validators.min(1)]],
    device_sku: ['', [Validators.required, Validators.minLength(1)]],
    reason_id: [0, [Validators.required, Validators.min(1)]],
    remarks: [''],
    actor_id: [0, [Validators.required, Validators.min(1)]],
  });

  // Form configuration
  title = 'Create Repair';
  subtitle = 'Create a new repair record for a device';

  fields = computed<FormField[]>(() => [
    {
      key: 'device_id',
      label: 'Device ID',
      type: 'number',
      required: true,
      placeholder: 'Enter device ID',
      helpText: 'The ID of the device that needs repair'
    },
    {
      key: 'device_sku',
      label: 'Device SKU',
      type: 'text',
      required: true,
      placeholder: 'Enter device SKU',
      helpText: 'The SKU of the device being repaired'
    },
    {
      key: 'reason_id',
      label: 'Repair Reason ID',
      type: 'number',
      required: true,
      placeholder: 'Enter reason ID',
      helpText: 'The ID of the repair reason'
    },
    {
      key: 'remarks',
      label: 'Remarks',
      type: 'textarea',
      required: false,
      placeholder: 'Additional notes about the repair...',
      helpText: 'Optional remarks or notes about the repair'
    },
    {
      key: 'actor_id',
      label: 'Actor ID',
      type: 'number',
      required: true,
      placeholder: 'Enter actor ID',
      helpText: 'The ID of the person creating this repair record'
    },
  ]);

  actions = computed<FormAction[]>(() => [
    {
      label: 'Cancel',
      type: 'button',
      variant: 'ghost'
    }
  ]);

  submitLabel = computed(() => 'Create Repair');

  ngOnInit() {
    // No initial data loading needed for repair creation
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.error.set(null);

    const formData = this.form.value as RepairFormData;
    const payload: RepairCreateInput = {
      device_id: formData.device_id,
      device_sku: formData.device_sku,
      reason_id: formData.reason_id,
      remarks: formData.remarks || undefined,
      actor_id: formData.actor_id,
    };

    this.api.createRepair(payload).subscribe({
      next: (response) => {
        this.submitting.set(false);
        if (response.status === 201) {
          // Navigate back to stock management with repairs tab
          this.router.navigate(['/stock-management'], { 
            queryParams: { tab: 'repairs' } 
          });
        } else {
          this.error.set(response.message || 'Failed to create repair');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.message || 'An error occurred while creating the repair');
      }
    });
  }

  onActionClick(event: { action: string; data?: any }) {
    if (event.action === 'Cancel') {
      this.onCancel();
    }
  }

  onCancel() {
    this.router.navigate(['/stock-management'], { 
      queryParams: { tab: 'repairs' } 
    });
  }
}

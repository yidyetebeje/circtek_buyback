import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

import { GenericFormPageComponent, type FormField, type FormAction } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { SkuSpecsCreateInput, SkuSpecsUpdateInput, SkuSpecsRecord } from '../../core/models/sku-specs';

interface SkuSpecsFormData {
  sku: string;
  make?: string;
  model_no?: string;
  model_name?: string;
  is_part?: boolean;
  storage?: string;
  memory?: string;
  color?: string;
  device_type?: 'iPhone' | 'Macbook' | 'Airpods' | 'Android';
  status?: boolean;
}

@Component({
  selector: 'app-sku-specs-form',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent],
  templateUrl: './sku-specs-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkuSpecsFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(ToastrService);

  // State
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);
  skuSpecsId = signal<number | null>(null);

  // Form
  form = this.fb.group({
    sku: ['', [Validators.required, Validators.minLength(1)]],
    make: [''],
    model_no: [''],
    model_name: [''],
    is_part: [false],
    storage: [''],
    memory: [''],
    color: [''],
    device_type: [''],
    status: [true],
  });

  // Form configuration
  title = computed(() => this.isEditMode() ? 'Edit SKU Specs' : 'Create SKU Specs');
  subtitle = computed(() => this.isEditMode() ? 'Update SKU specifications' : 'Create new SKU specifications');

  fields = computed<FormField[]>(() => [
    {
      key: 'sku',
      label: 'SKU',
      type: 'text',
      required: true,
      placeholder: 'Enter SKU code',
      disabled: this.isEditMode(), // SKU cannot be changed in edit mode
    },
    {
      key: 'make',
      label: 'Make',
      type: 'text',
      placeholder: 'e.g., Apple, Samsung',
    },
    {
      key: 'model_no',
      label: 'Model Number',
      type: 'text',
      placeholder: 'e.g., A2482, SM-G991B',
    },
    {
      key: 'model_name',
      label: 'Model Name',
      type: 'text',
      placeholder: 'e.g., iPhone 13, Galaxy S21',
    },
    {
      key: 'is_part',
      label: 'Is Part',
      type: 'checkbox',
      helpText: 'Check if this is a part/component rather than a complete device',
    },
    {
      key: 'device_type',
      label: 'Device Type',
      type: 'select',
      options: [
        { label: 'Select device type', value: '' },
        { label: 'iPhone', value: 'iPhone' },
        { label: 'Macbook', value: 'Macbook' },
        { label: 'Airpods', value: 'Airpods' },
        { label: 'Android', value: 'Android' },
      ],
    },
    {
      key: 'storage',
      label: 'Storage',
      type: 'text',
      placeholder: 'e.g., 128GB, 256GB, 1TB',
    },
    {
      key: 'memory',
      label: 'Memory (RAM)',
      type: 'text',
      placeholder: 'e.g., 4GB, 8GB, 16GB',
    },
    {
      key: 'color',
      label: 'Color',
      type: 'text',
      placeholder: 'e.g., Black, White, Blue',
    },
    {
      key: 'status',
      label: 'Active',
      type: 'checkbox',
    },
  ]);

  actions = computed<FormAction[]>(() => [
    {
      label: 'Cancel',
      type: 'button',
      variant: 'ghost'
    }
  ]);

  submitLabel = computed(() => this.isEditMode() ? 'Update SKU Specs' : 'Create SKU Specs');

  ngOnInit() {
    // Check if we're in edit mode
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.skuSpecsId.set(Number(id));
      this.loadSkuSpecs(Number(id));
    }
  }

  private loadSkuSpecs(id: number) {
    this.loading.set(true);
    this.api.getSkuSpecsById(id).subscribe({
      next: (response) => {
        if (response.data) {
          this.form.patchValue({
            sku: response.data.sku,
            make: response.data.make || '',
            model_no: response.data.model_no || '',
            model_name: response.data.model_name || '',
            is_part: response.data.is_part ?? false,
            storage: response.data.storage || '',
            memory: response.data.memory || '',
            color: response.data.color || '',
            device_type: response.data.device_type || '',
            status: response.data.status ?? true,
          });
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set('Failed to load SKU specs');
        this.loading.set(false);
      },
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const formData = this.form.value as SkuSpecsFormData;
    
    // Clean up empty strings to undefined for optional fields
    const cleanData = {
      sku: formData.sku,
      make: formData.make || undefined,
      model_no: formData.model_no || undefined,
      model_name: formData.model_name || undefined,
      is_part: formData.is_part,
      storage: formData.storage || undefined,
      memory: formData.memory || undefined,
      color: formData.color || undefined,
      device_type: formData.device_type || undefined,
      status: formData.status,
    };

    const request = this.isEditMode() 
      ? this.api.updateSkuSpecs(this.skuSpecsId()!, cleanData as SkuSpecsUpdateInput)
      : this.api.createSkuSpecs(cleanData as SkuSpecsCreateInput);

    request.subscribe({
      next: (response) => {
        if (response.status === 200 || response.status === 201) {
          this.toastr.success(`SKU Specs ${this.isEditMode() ? 'updated' : 'created'} successfully!`, 'Success');
          this.router.navigate(['/stock-management'], { 
            queryParams: { tab: 'sku-specs' } 
          });
        } else {
          this.error.set(response.message || 'Operation failed');
          this.toastr.error(response.message || 'Operation failed', 'Error');
        }
        this.submitting.set(false);
      },
      error: (error) => {
        this.error.set(error.error?.message || 'Operation failed');
        this.submitting.set(false);
        this.toastr.error(error.error?.message || 'Operation failed', 'Error');
      },
    });
  }

  onCancel() {
    this.router.navigate(['/stock-management'], { 
      queryParams: { tab: 'sku-specs' } 
    });
  }

  onActionClick(event: { action: string; data?: any }): void {
    if (event.action === 'Cancel') {
      this.onCancel();
    }
  }

  onBackClick(): void {
    this.onCancel();
  }
}

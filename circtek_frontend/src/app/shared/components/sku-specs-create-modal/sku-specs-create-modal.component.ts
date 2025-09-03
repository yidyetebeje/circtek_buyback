import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GenericModalComponent, type ModalAction } from '../generic-modal/generic-modal.component';
import { ApiService } from '../../../core/services/api.service';
import { SkuSpecsCreateInput } from '../../../core/models/sku-specs';

@Component({
  selector: 'app-sku-specs-create-modal',
  imports: [CommonModule, ReactiveFormsModule, GenericModalComponent],
  templateUrl: './sku-specs-create-modal.component.html',
  styleUrls: ['./sku-specs-create-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkuSpecsCreateModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  // Inputs
  isOpen = input<boolean>(false);
  suggestedSku = input<string>('');

  // Outputs
  close = output<void>();
  created = output<{ sku: string; model_name: string | null; is_part: boolean | null }>();

  // State
  form = signal<FormGroup>(this.createForm());
  formValid = signal<boolean>(false);
  submitting = signal<boolean>(false);
  error = signal<string | null>(null);

  // Computed
  title = computed(() => 'Create New SKU Specs');
  submitLabel = computed(() => 'Create SKU Specs');
  
  actions = computed<ModalAction[]>(() => [
    {
      label: 'Cancel',
      variant: 'ghost',
      action: 'cancel'
    },
    {
      label: this.submitLabel(),
      variant: 'accent',
      disabled: !this.formValid() || this.submitting(),
      action: 'submit'
    }
  ]);

  constructor() {
    // Watch for changes to suggestedSku and recreate form
    effect(() => {
      const suggested = this.suggestedSku();
      const isOpen = this.isOpen();
      
      // Recreate form when modal opens or suggested SKU changes
      if (isOpen) {
        const newForm = this.createForm();
        this.form.set(newForm);
        
        // Set initial validity
        this.formValid.set(newForm.valid);
        
        // Subscribe to form status changes
        newForm.statusChanges.subscribe(() => {
          this.formValid.set(newForm.valid);
        });

        // Watch for is_part changes to toggle required fields
        newForm.get('is_part')?.valueChanges.subscribe(() => {
          this.updateFieldRequirements();
        });
      }
    });
  }

  private createForm(): FormGroup {
    const suggested = this.suggestedSku();
    return this.fb.group({
      sku: [suggested || '', [Validators.required]],
      make: [''],
      model_no: [''],
      model_name: [''],
      is_part: [false],
      // Device-specific fields (conditionally required)
      storage: [''],
      memory: [''],
      color: [''],
      device_type: [''],
      status: [true]
    });
  }

  private updateFieldRequirements(): void {
    const form = this.form();
    const isPart = form.get('is_part')?.value;

    // Device-specific fields are only required when is_part is false
    const deviceFields = ['make', 'model_no', 'model_name', 'device_type'];
    
    deviceFields.forEach(fieldName => {
      const field = form.get(fieldName);
      if (field) {
        if (isPart) {
          field.clearValidators();
        } else {
          field.setValidators([Validators.required]);
        }
        field.updateValueAndValidity();
      }
    });
  }

  onActionClick(action: string): void {
    if (action === 'submit') {
      this.onSubmit();
    } else if (action === 'cancel') {
      this.onClose();
    }
  }

  onSubmit(): void {
    const form = this.form();
    if (form.invalid) return;

    this.submitting.set(true);
    this.error.set(null);

    const formValue = form.value;
    const payload: SkuSpecsCreateInput = {
      sku: formValue.sku,
      make: formValue.make || undefined,
      model_no: formValue.model_no || undefined,
      model_name: formValue.model_name || undefined,
      is_part: formValue.is_part,
      // Device-specific fields (only include if not a part)
      ...(formValue.is_part ? {} : {
        storage: formValue.storage || undefined,
        memory: formValue.memory || undefined,
        color: formValue.color || undefined,
        device_type: formValue.device_type || undefined,
      }),
      status: formValue.status
    };

    this.api.createSkuSpecs(payload).subscribe({
      next: (response) => {
        this.submitting.set(false);
        if (response.status === 201 && response.data) {
          this.created.emit({
            sku: response.data.sku,
            model_name: response.data.model_name || null,
            is_part: response.data.is_part
          });
          this.onClose();
        } else {
          this.error.set(response.message || 'Failed to create SKU specs');
        }
      },
      error: (error) => {
        this.submitting.set(false);
        this.error.set('Failed to create SKU specs');
      }
    });
  }

  onClose(): void {
    this.form().reset();
    this.error.set(null);
    this.submitting.set(false);
    this.close.emit();
  }

  // Helper methods for validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.form().get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string | null {
    const field = this.form().get(fieldName);
    if (field && field.invalid && field.touched) {
      if (field.errors?.['required']) return `${fieldName} is required`;
    }
    return null;
  }

  isDeviceFieldsSection(): boolean {
    return !this.form().get('is_part')?.value;
  }
}

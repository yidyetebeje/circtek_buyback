import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GenericModalComponent, type ModalAction } from '../../../shared/components/generic-modal/generic-modal.component';
import { SkuAutocompleteComponent, type SkuOption } from '../../../shared/components/sku-autocomplete/sku-autocomplete.component';
import { SkuSpecsCreateModalComponent } from '../../../shared/components/sku-specs-create-modal/sku-specs-create-modal.component';
import { CurrencyService } from '../../../core/services/currency.service';

export interface PurchaseItem {
  id?: string;
  sku: string;
  quantity: number;
  price: number;
  is_part: boolean;
}

@Component({
  selector: 'app-purchase-item-modal',
  imports: [CommonModule, ReactiveFormsModule, GenericModalComponent, SkuAutocompleteComponent, SkuSpecsCreateModalComponent],
  templateUrl: './purchase-item-modal.component.html',
  styleUrls: ['./purchase-item-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseItemModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly currencyService = inject(CurrencyService);

  // Custom validators
  private static skuValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null; // Let required validator handle empty values
    }

    const trimmedValue = typeof value === 'string' ? value.trim() : String(value);
    
    // Check for whitespace only
    if (trimmedValue.length === 0) {
      return { whitespace: { message: 'SKU cannot be empty or spaces only' } };
    }

    // Check max length (21 characters due to barcode limitations)
    if (trimmedValue.length > 21) {
      return { maxlength: { message: 'SKU cannot exceed 21 characters (barcode limitation)', requiredLength: 21, actualLength: trimmedValue.length } };
    }

    // Validate alphanumeric format (no special characters except hyphen and underscore)
    const validSkuPattern = /^[A-Za-z0-9_-]+$/;
    if (!validSkuPattern.test(trimmedValue)) {
      return { invalidFormat: { message: 'SKU can only contain letters, numbers, hyphens, and underscores' } };
    }

    return null;
  };

  private static quantityValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null; // Let required validator handle empty values
    }

    const numValue = Number(value);
    
    // Check if it's a valid number
    if (isNaN(numValue)) {
      return { invalidNumber: { message: 'Please enter a valid number' } };
    }

    // Check if it's a positive integer
    if (numValue <= 0) {
      return { mustBePositive: { message: 'Quantity must be greater than 0' } };
    }

    if (!Number.isInteger(numValue)) {
      return { mustBeInteger: { message: 'Quantity must be a whole number' } };
    }

    // Check for reasonable maximum (e.g., 1 million)
    if (numValue > 1000000) {
      return { tooLarge: { message: 'Quantity cannot exceed 1,000,000' } };
    }

    return null;
  };

  private static priceValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null; // Let required validator handle empty values
    }

    const numValue = Number(value);
    
    // Check if it's a valid number
    if (isNaN(numValue)) {
      return { invalidNumber: { message: 'Please enter a valid number' } };
    }

    // Check if it's non-negative
    if (numValue < 0) {
      return { mustBeNonNegative: { message: 'Price cannot be negative' } };
    }

    // Check for reasonable maximum (e.g., 1 million)
    if (numValue > 1000000) {
      return { tooLarge: { message: 'Price cannot exceed 1,000,000' } };
    }

    // Check for reasonable decimal places (max 2)
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      return { tooManyDecimals: { message: 'Price cannot have more than 2 decimal places' } };
    }

    return null;
  };

  // Inputs
  isOpen = input<boolean>(false);
  editingItem = input<PurchaseItem | null>(null);

  // Outputs
  close = output<void>();
  save = output<PurchaseItem>();

  // State
  form = signal<FormGroup>(this.createForm());
  formValid = signal<boolean>(false);
  isSkuCreateModalOpen = signal<boolean>(false);
  suggestedSku = signal<string>('');
  skuCreationSuccess = signal<string | null>(null);
  skuCreationError = signal<string | null>(null);

  // Computed
  title = computed(() => this.editingItem() ? 'Edit Item' : 'Add Item');
  submitLabel = computed(() => this.editingItem() ? 'Update Item' : 'Add Item');
  currentCurrencySymbol = computed(() => this.currencyService.getSymbolSync());
  
  actions = computed<ModalAction[]>(() => [
    {
      label: 'Cancel',
      variant: 'ghost',
      action: 'cancel'
    },
    {
      label: this.submitLabel(),
      variant: 'accent',
      disabled: !this.formValid(),
      action: 'submit'
    }
  ]);

  constructor() {
    // Watch for changes to editingItem and recreate form
    effect(() => {
      const item = this.editingItem();
      const isOpen = this.isOpen();
      
      // Recreate form when modal opens or editing item changes
      if (isOpen) {
        const newForm = this.createForm();
        this.form.set(newForm);
        
        // Set initial validity
        this.updateFormValidity();
        
        // Subscribe to form changes - this will capture all value and status changes
        newForm.valueChanges.subscribe(() => {
          this.updateFormValidity();
        });
        
        newForm.statusChanges.subscribe(() => {
          this.updateFormValidity();
        });
      }
    });
  }

  private updateFormValidity(): void {
    // Use setTimeout to ensure validation has completed
    setTimeout(() => {
      this.formValid.set(this.form().valid);
    }, 0);
  }

  private createForm(): FormGroup {
    const item = this.editingItem();
    return this.fb.group({
      sku: [item?.sku || '', [Validators.required, PurchaseItemModalComponent.skuValidator]],
      quantity: [item?.quantity || 1, [Validators.required, PurchaseItemModalComponent.quantityValidator]],
      price: [item?.price || 0, [Validators.required, PurchaseItemModalComponent.priceValidator]],
      is_part: [item?.is_part || false]
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
    const currentForm = this.form();
    currentForm.markAllAsTouched();
    this.updateFormValidity();

    if (currentForm.invalid) {
      return;
    }

    const formValue = currentForm.value;
    const item: PurchaseItem = {
      id: this.editingItem()?.id || crypto.randomUUID(),
      sku: formValue.sku,
      quantity: formValue.quantity,
      price: formValue.price,
      is_part: formValue.is_part
    };

    this.save.emit(item);
  }

  onClose(): void {
    this.form().reset();
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
      const errors = field.errors;
      if (errors?.['required']) return `${fieldName} is required`;
      if (errors?.['minLength']) return errors['minLength'].message || `${fieldName} must be at least ${errors['minLength'].requiredLength} characters`;
      if (errors?.['minlength']) return `${fieldName} must be at least ${errors['minlength'].requiredLength} characters`;
      if (errors?.['maxlength']) return errors['maxlength'].message || `${fieldName} cannot exceed ${errors['maxlength'].requiredLength} characters`;
      if (errors?.['whitespace']) return errors['whitespace'].message;
      if (errors?.['invalidFormat']) return errors['invalidFormat'].message;
      if (errors?.['min']) return `${fieldName} must be greater than ${errors['min'].min}`;
      if (errors?.['invalidNumber']) return errors['invalidNumber'].message;
      if (errors?.['mustBePositive']) return errors['mustBePositive'].message;
      if (errors?.['mustBeInteger']) return errors['mustBeInteger'].message;
      if (errors?.['mustBeNonNegative']) return errors['mustBeNonNegative'].message;
      if (errors?.['tooLarge']) return errors['tooLarge'].message;
      if (errors?.['tooManyDecimals']) return errors['tooManyDecimals'].message;
    }
    return null;
  }

  // SKU autocomplete handlers
  onSkuChange(sku: string): void {
    this.form().patchValue({ sku }, { emitEvent: true });
    // Mark as touched to trigger validation display
    this.form().get('sku')?.markAsTouched();
    this.form().get('sku')?.updateValueAndValidity();
  }

  onSkuSelected(option: SkuOption): void {
    this.form().patchValue({ 
      sku: option.sku,
      is_part: option.is_part || false
    }, { emitEvent: true });
    // Mark as touched to trigger validation display
    this.form().get('sku')?.markAsTouched();
    this.form().get('sku')?.updateValueAndValidity();
  }

  onCreateNewSku(suggestedSku: string): void {
    this.suggestedSku.set(suggestedSku);
    this.isSkuCreateModalOpen.set(true);
  }

  onSkuCreated(createdSku: { sku: string; model_name: string | null; is_part: boolean | null }): void {
    this.form().patchValue({ 
      sku: createdSku.sku,
      is_part: createdSku.is_part || false
    }, { emitEvent: true });
    // Mark as touched and update validity
    this.form().get('sku')?.markAsTouched();
    this.form().get('sku')?.updateValueAndValidity();
    
    this.isSkuCreateModalOpen.set(false);
    this.skuCreationSuccess.set(`SKU "${createdSku.sku}" created successfully`);
    this.skuCreationError.set(null);
    
    // Clear success message after 5 seconds
    setTimeout(() => {
      this.skuCreationSuccess.set(null);
    }, 5000);
  }

  onSkuCreateModalClose(): void {
    this.isSkuCreateModalOpen.set(false);
    this.suggestedSku.set('');
  }

  clearMessages(): void {
    this.skuCreationSuccess.set(null);
    this.skuCreationError.set(null);
  }
}

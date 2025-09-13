import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GenericModalComponent, type ModalAction } from '../../../shared/components/generic-modal/generic-modal.component';
import { BarcodeScannerComponent, type ScanResult } from '../../../shared/components/barcode-scanner/barcode-scanner.component';
import { ApiService } from '../../../core/services/api.service';

export interface TransferItem {
  id?: string;
  sku: string;
  device_id: number;
  is_part: boolean;
  quantity: number;
}

@Component({
  selector: 'app-transfer-item-modal',
  imports: [CommonModule, ReactiveFormsModule, GenericModalComponent, BarcodeScannerComponent],
  templateUrl: './transfer-item-modal.component.html',
  styleUrls: ['./transfer-item-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferItemModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Inputs
  isOpen = input<boolean>(false);
  editingItem = input<TransferItem | null>(null);

  // Outputs
  close = output<void>();
  save = output<TransferItem>();

  // State
  formValid = signal<boolean>(false);
  form = signal<FormGroup>(this.createForm());
  deviceLookupLoading = signal<boolean>(false);
  deviceLookupError = signal<string>('');
  foundDevice = signal<any | null>(null);
  formUpdateTrigger = signal<number>(0); // Trigger to force computed updates

  // Computed
  title = computed(() => this.editingItem() ? 'Edit Item' : 'Add Item');
  submitLabel = computed(() => this.editingItem() ? 'Update Item' : 'Add Item');
  
  // Check if form is ready for submission
  isFormReadyForSubmit = computed(() => {
    // Include formUpdateTrigger to make this reactive to form changes
    const trigger = this.formUpdateTrigger();
    const form = this.form();
    
    if (!form || this.deviceLookupLoading()) return false;
    
    const isPart = form.get('is_part')?.value;
    const deviceId = form.get('device_id')?.value;
    const sku = form.get('sku')?.value?.trim();
    const quantity = Number(form.get('quantity')?.value);
    
    if (isPart) {
      // For parts, need valid SKU and valid quantity
      return sku && sku.length > 0 && quantity && quantity > 0;
    } else {
      // For devices, need valid device_id from scanner and quantity 1
      return deviceId && quantity === 1;
    }
  });
  
  actions = computed<ModalAction[]>(() => [
    {
      label: 'Cancel',
      variant: 'ghost',
      action: 'cancel'
    },
    {
      label: this.submitLabel(),
      variant: 'accent',
      disabled: !this.isFormReadyForSubmit(),
      action: 'submit'
    }
  ]);
  // Use a method instead of computed so change detection reevaluates this each time
  isPartItem(): boolean {
    return !!this.form().get('is_part')?.value;
  }

  constructor() {
    // Watch for changes to editingItem and recreate form
    effect(() => {
      const item = this.editingItem();
      const isOpen = this.isOpen();
      
      // Recreate form when modal opens or editing item changes
      if (isOpen) {
        this.form.set(this.createForm());
        // Set initial form validity after form is created
        setTimeout(() => {
          this.updateFormValiditySignal();
          this.formUpdateTrigger.set(this.formUpdateTrigger() + 1);
        }, 0);
      }
    });
  }

  private createForm(): FormGroup {
    const item = this.editingItem();
    const form = this.fb.group({
      sku: [item?.sku || ''],
      device_id: [item?.device_id || ''],
      quantity: [item?.quantity || 1],
      is_part: [item?.is_part || false]
    });

    this.updateValidators(form, form.get('is_part')?.value ?? false, false);
    
    // Subscribe to form value changes to update validity signal and trigger computed updates
    form.valueChanges.subscribe(() => {
      this.updateFormValiditySignal();
      // Trigger computed property update by incrementing the trigger
      this.formUpdateTrigger.set(this.formUpdateTrigger() + 1);
    });
    
    return form;
  }

  private updateFormValiditySignal(): void {
    if (this.formValid && this.form) {
      this.formValid.set(this.form().valid);
    }
  }

  private updateValidators(form: FormGroup, isPart: boolean, updateSignal: boolean = true): void {
    const skuControl = form.get('sku');
    const deviceIdControl = form.get('device_id');
    const quantityControl = form.get('quantity');

    // Clear all validators first
    skuControl?.clearValidators();
    deviceIdControl?.clearValidators();
    quantityControl?.clearValidators();

    if (isPart) {
      // For parts, SKU and quantity are required
      skuControl?.setValidators([Validators.required, Validators.pattern(/^[\w\-\s]+$/)]);
      quantityControl?.setValidators([
        Validators.required, 
        Validators.min(1), 
        Validators.max(999999), 
        Validators.pattern(/^[0-9]+$/)
      ]);
    } else {
      // For devices, device_id is required (and populated by scanner)
      deviceIdControl?.setValidators([Validators.required]);
      // Quantity is fixed at 1 for devices
      quantityControl?.setValidators([Validators.required, Validators.min(1), Validators.max(1)]);
    }

    // Update validity
    skuControl?.updateValueAndValidity();
    deviceIdControl?.updateValueAndValidity();
    quantityControl?.updateValueAndValidity();
    
    // Update form validity signal only if requested (avoid during initialization)
    if (updateSignal) {
      this.updateFormValiditySignal();
    }
  }
  
  onDeviceScan(result: ScanResult): void {
    if (!result.isValid) {
      this.deviceLookupError.set('Invalid IMEI or serial number');
      return;
    }
    
    this.lookupDevice(result.value);
  }
  
  onDeviceInputChange(value: string): void {
    // Clear previous results when input changes
    if (this.foundDevice()) {
      this.foundDevice.set(null);
    }
    if (this.deviceLookupError()) {
      this.deviceLookupError.set('');
    }
    // Clear device_id when input changes
    this.form().patchValue({ device_id: '' });
    this.updateFormValiditySignal();
    this.formUpdateTrigger.set(this.formUpdateTrigger() + 1);
    this.cdr.markForCheck();
  }
  
  onDeviceSearchClick(value: string): void {
    if (value.trim()) {
      this.lookupDevice(value.trim());
    } else {
      this.deviceLookupError.set('Please enter an IMEI or Serial number');
    }
  }
  
  private lookupDevice(identifier: string): void {
    this.deviceLookupLoading.set(true);
    this.deviceLookupError.set('');
    this.foundDevice.set(null);
    
    this.api.findDeviceByImeiOrSerial(identifier).subscribe({
      next: (response) => {
        this.deviceLookupLoading.set(false);
        if (response.data) {
          this.foundDevice.set(response.data);
          // Auto-populate form with device data
          this.form().patchValue({
            sku: response.data.sku || '',
            device_id: response.data.id,
            quantity: 1 // Devices are always quantity 1
          });
          this.deviceLookupError.set('');
          // Manually trigger form validation update after patching values
          setTimeout(() => {
            this.updateFormValiditySignal();
            this.formUpdateTrigger.set(this.formUpdateTrigger() + 1);
            this.cdr.markForCheck();
          }, 0);
        } else {
          this.deviceLookupError.set('Device not found with this IMEI/Serial number');
          // Clear device_id when device not found
          this.form().patchValue({ device_id: '' });
          this.updateFormValiditySignal();
          this.formUpdateTrigger.set(this.formUpdateTrigger() + 1);
          this.cdr.markForCheck();
        }
      },
      error: (error) => {
        this.deviceLookupLoading.set(false);
        this.deviceLookupError.set('Failed to lookup device. Please try again.');
        // Clear device_id on error
        this.form().patchValue({ device_id: '' });
        this.updateFormValiditySignal();
        this.formUpdateTrigger.set(this.formUpdateTrigger() + 1);
        this.cdr.markForCheck();
        console.error('Device lookup error:', error);
      }
    });
  }
  
  onIsPartChange(): void {
    const form = this.form();
    const isPart = form.get('is_part')?.value ?? false;
    this.updateValidators(form, isPart);

    // Reset fields when switching types
    this.foundDevice.set(null);
    this.deviceLookupError.set('');
    this.deviceLookupLoading.set(false);
    
    // Always reset SKU and device_id, and set quantity to 1
    form.patchValue({
      sku: '',
      device_id: isPart ? null : '', // Set device_id to null for parts
      quantity: 1
    });

    // Update form validity after patching values
    this.updateFormValiditySignal();
    
    // Trigger computed property update
    this.formUpdateTrigger.set(this.formUpdateTrigger() + 1);
    
    // Ensure template updates under OnPush
    this.cdr.markForCheck();
  }

  onActionClick(action: string): void {
    if (action === 'submit') {
      this.onSubmit();
    } else if (action === 'cancel') {
      this.onClose();
    }
  }

  onSubmit(): void {
    if (this.form().invalid) return;

    const formValue = this.form().value;
    const item: TransferItem = {
      id: this.editingItem()?.id || crypto.randomUUID(),
      sku: formValue.sku,
      device_id: Number(formValue.device_id),
      quantity: Number(formValue.quantity),
      is_part: formValue.is_part
    };

    this.save.emit(item);
    this.onClose();
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
      if (field.errors?.['required']) return `${fieldName} is required`;
      if (field.errors?.['min']) return `${fieldName} must be greater than ${field.errors['min'].min}`;
      if (field.errors?.['max']) return `${fieldName} must be less than ${field.errors['max'].max}`;
      if (field.errors?.['pattern']) {
        if (fieldName === 'quantity') return 'Quantity must contain only numbers';
        if (fieldName === 'sku') return 'SKU contains invalid characters';
      }
    }
    return null;
  }
}

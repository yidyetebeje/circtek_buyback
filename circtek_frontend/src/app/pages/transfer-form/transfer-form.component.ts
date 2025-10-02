import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';

import { GenericFormPageComponent, type FormField, type FormAction } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { TransferItemModalComponent, type TransferItem } from './transfer-item-modal/transfer-item-modal.component';

interface TransferFormData {
  from_warehouse_id: number;
  to_warehouse_id: number;
  tracking_number?: string;
  tracking_url?: string;
  items: TransferItem[];
}

@Component({
  selector: 'app-transfer-form',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent, TransferItemModalComponent],
  templateUrl: './transfer-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  // State
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  warehouseOptions = signal<Array<{ label: string; value: string }>>([]);
  items = signal<TransferItem[]>([]);
  isModalOpen = signal(false);
  editingItem = signal<TransferItem | null>(null);
  
  // Computed validation error message
  warehouseValidationError = computed(() => {
    const form = this.form();
    if (form?.hasError('sameWarehouse')) {
      return 'From and To warehouses must be different';
    }
    return null;
  });
  
  // Combined error message for display
  displayError = computed(() => {
    return this.error() || this.warehouseValidationError();
  });

  // Form
  form = signal<FormGroup>(this.createForm());

  // Form configuration
  title = signal('Create Transfer');
  subtitle = signal('Transfer items between warehouses');
  submitLabel = signal('Create Transfer');

  // Check if warehouses are the same for visual feedback
  hasWarehouseError = computed(() => {
    const form = this.form();
    const fromWarehouse = form.get('from_warehouse_id')?.value;
    const toWarehouse = form.get('to_warehouse_id')?.value;
    return fromWarehouse && toWarehouse && fromWarehouse === toWarehouse;
  });

  fields = computed<FormField[]>(() => [
    {
      key: 'from_warehouse_id',
      label: 'From Warehouse',
      type: 'select',
      required: true,
      placeholder: 'Select warehouse',
      options: this.warehouseOptions(),
      helpText: this.hasWarehouseError() ? 'Must be different from To Warehouse' : undefined
    },
    {
      key: 'to_warehouse_id',
      label: 'To Warehouse',
      type: 'select',
      required: true,
      placeholder: 'Select warehouse',
      options: this.warehouseOptions(),
      helpText: this.hasWarehouseError() ? 'Must be different from From Warehouse' : undefined
    },
    {
      key: 'tracking_number',
      label: 'Tracking Number',
      type: 'text',
      placeholder: 'Package tracking number'
    },
    {
      key: 'tracking_url',
      label: 'Tracking URL',
      type: 'text',
      placeholder: 'https://tracking.example.com/...'
    }
  ]);

  actions = computed<FormAction[]>(() => [
    {
      label: 'Cancel',
      type: 'button',
      variant: 'secondary'
    }
  ]);

  // Computed values for items
  totalItems = computed(() => this.items().length);
  totalQuantity = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));

  constructor() {
    // Load warehouse options
    effect(() => {
      this.loadWarehouses();
    });
  }

  private createForm(): FormGroup {
    const form = this.fb.group({
      from_warehouse_id: ['', [Validators.required]],
      to_warehouse_id: ['', [Validators.required]],
      tracking_number: [''],
      tracking_url: ['']
    });

    // Add cross-field validation for warehouse selection
    form.addValidators(this.warehouseValidator.bind(this));
    
    // Watch for changes to either warehouse field
    form.get('from_warehouse_id')?.valueChanges.subscribe(() => {
      form.get('to_warehouse_id')?.updateValueAndValidity({ emitEvent: false });
      form.updateValueAndValidity({ emitEvent: false });
      this.error.set(null); // Clear previous error
    });
    
    form.get('to_warehouse_id')?.valueChanges.subscribe(() => {
      form.get('from_warehouse_id')?.updateValueAndValidity({ emitEvent: false });
      form.updateValueAndValidity({ emitEvent: false });
      this.error.set(null); // Clear previous error
    });

    return form;
  }

  private warehouseValidator(control: AbstractControl): {[key: string]: any} | null {
    const formGroup = control as FormGroup;
    const fromWarehouse = formGroup.get('from_warehouse_id')?.value;
    const toWarehouse = formGroup.get('to_warehouse_id')?.value;
    
    if (fromWarehouse && toWarehouse && fromWarehouse === toWarehouse) {
      // Set error on both fields for visual feedback
      const fromControl = formGroup.get('from_warehouse_id');
      const toControl = formGroup.get('to_warehouse_id');
      
      if (fromControl && toControl) {
        fromControl.setErrors({ ...fromControl.errors, sameWarehouse: true });
        toControl.setErrors({ ...toControl.errors, sameWarehouse: true });
      }
      
      return { 'sameWarehouse': true };
    } else {
      // Clear the sameWarehouse error if warehouses are different
      const fromControl = formGroup.get('from_warehouse_id');
      const toControl = formGroup.get('to_warehouse_id');
      
      if (fromControl?.errors?.['sameWarehouse']) {
        const { sameWarehouse, ...rest } = fromControl.errors;
        fromControl.setErrors(Object.keys(rest).length > 0 ? rest : null);
      }
      
      if (toControl?.errors?.['sameWarehouse']) {
        const { sameWarehouse, ...rest } = toControl.errors;
        toControl.setErrors(Object.keys(rest).length > 0 ? rest : null);
      }
    }
    
    return null;
  }

  private loadWarehouses(): void {
    this.api.getWarehouses(new HttpParams().set('limit', '1000')).subscribe({
      next: (response) => {
        if (response.data) {
          const options = response.data.map(warehouse => ({
            label: warehouse.name,
            value: String(warehouse.id)
          }));
          this.warehouseOptions.set(options);
        }
      },
      error: (err) => {
        console.error('Failed to load warehouses:', err);
      }
    });
  }

  // Modal management
  openAddItemModal(): void {
    this.editingItem.set(null);
    this.isModalOpen.set(true);
  }

  openEditItemModal(item: TransferItem): void {
    this.editingItem.set(item);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingItem.set(null);
  }

  saveItem(item: TransferItem): void {
    const currentItems = this.items();
    const existingIndex = currentItems.findIndex(i => i.id === item.id);
    
    if (existingIndex >= 0) {
      // Update existing item
      const updatedItems = [...currentItems];
      updatedItems[existingIndex] = item;
      this.items.set(updatedItems);
    } else {
      // Add new item
      this.items.set([...currentItems, item]);
    }
  }

  removeItem(itemId: string): void {
    const currentItems = this.items();
    this.items.set(currentItems.filter(item => item.id !== itemId));
  }

  onSubmit(): void {
    // Check for warehouse validation errors first
    if (this.form().hasError('sameWarehouse')) {
      this.error.set('From and To warehouses must be different');
      this.form().markAllAsTouched();
      return;
    }

    if (this.form().invalid || this.submitting()) {
      this.form().markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    // Get form values
    const formValue = this.form().value as TransferFormData;

    // Validate items
    const transferItems = this.items();
    if (transferItems.length === 0) {
      this.error.set('At least one item is required');
      this.submitting.set(false);
      return;
    }

    // Prepare payload for API
    const payload = {
      transfer: {
        from_warehouse_id: Number(formValue.from_warehouse_id),
        to_warehouse_id: Number(formValue.to_warehouse_id),
        tracking_number: formValue.tracking_number || undefined,
        tracking_url: formValue.tracking_url || undefined
      },
      items: transferItems.map(item => ({
        sku: item.sku,
        device_id: item.device_id,
        is_part: item.is_part,
        quantity: item.quantity
      }))
    };

    this.api.createTransferWithItems(payload).subscribe({
      next: (response) => {
        this.submitting.set(false);
        if (response.status === 201) {
          this.toast.saveSuccess('Transfer', 'created');
          this.router.navigate(['/stock-management'], { 
            queryParams: { tab: 'transfers' }
          });
        } else {
          this.error.set(response.message || 'Failed to create transfer');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.message || 'An error occurred while creating the transfer');
      }
    });
  }

  onActionClick(event: { action: string; data?: any }): void {
    if (event.action === 'Cancel') {
      this.navigateBack();
    }
  }

  onBackClick(): void {
    this.navigateBack();
  }

  private navigateBack(): void {
    this.router.navigate(['/stock-management'], { 
      queryParams: { tab: 'transfers' }
    });
  }
}

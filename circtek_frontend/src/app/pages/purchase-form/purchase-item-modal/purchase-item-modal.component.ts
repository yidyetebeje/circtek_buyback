import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GenericModalComponent, type ModalAction } from '../../../shared/components/generic-modal/generic-modal.component';

export interface PurchaseItem {
  id?: string;
  sku: string;
  quantity: number;
  price: number;
  is_part: boolean;
}

@Component({
  selector: 'app-purchase-item-modal',
  imports: [CommonModule, ReactiveFormsModule, GenericModalComponent],
  templateUrl: './purchase-item-modal.component.html',
  styleUrls: ['./purchase-item-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseItemModalComponent {
  private readonly fb = inject(FormBuilder);

  // Inputs
  isOpen = input<boolean>(false);
  editingItem = input<PurchaseItem | null>(null);

  // Outputs
  close = output<void>();
  save = output<PurchaseItem>();

  // State
  form = signal<FormGroup>(this.createForm());

  // Computed
  title = computed(() => this.editingItem() ? 'Edit Item' : 'Add Item');
  submitLabel = computed(() => this.editingItem() ? 'Update Item' : 'Add Item');
  
  actions = computed<ModalAction[]>(() => [
    {
      label: 'Cancel',
      variant: 'ghost',
      action: 'cancel'
    },
    {
      label: this.submitLabel(),
      variant: 'accent',
      disabled: this.form().invalid,
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
        this.form.set(this.createForm());
      }
    });
  }

  private createForm(): FormGroup {
    const item = this.editingItem();
    return this.fb.group({
      sku: [item?.sku || '', [Validators.required]],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]],
      price: [item?.price || 0, [Validators.required, Validators.min(0)]],
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
    if (this.form().invalid) return;

    const formValue = this.form().value;
    const item: PurchaseItem = {
      id: this.editingItem()?.id || crypto.randomUUID(),
      sku: formValue.sku,
      quantity: formValue.quantity,
      price: formValue.price,
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
    }
    return null;
  }
}

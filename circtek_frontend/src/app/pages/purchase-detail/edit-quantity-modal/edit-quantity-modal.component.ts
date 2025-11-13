import { Component, EventEmitter, Input, Output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PurchaseItemForEdit {
  id: number;
  sku: string;
  ordered_quantity: number;
  received_quantity: number;
  remaining_quantity: number;
}

@Component({
  selector: 'app-edit-quantity-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-quantity-modal.component.html'
})
export class EditQuantityModalComponent {
  @Input() isOpen = false;
  @Input() item: PurchaseItemForEdit | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ itemId: number; newQuantity: number }>();

  quantity = signal<number>(0);
  error = signal<string>('');

  constructor() {
    // Update quantity when item changes
    effect(() => {
      if (this.item) {
        this.quantity.set(this.item.ordered_quantity);
        this.error.set('');
      }
    });
  }

  minQuantity = computed(() => {
    return this.item?.received_quantity || 0;
  });

  isValid = computed(() => {
    const qty = this.quantity();
    const min = this.minQuantity();
    return qty > 0 && qty >= min;
  });

  onClose(): void {
    this.error.set('');
    this.close.emit();
  }

  onSave(): void {
    if (!this.item) return;

    const newQty = this.quantity();
    const minQty = this.minQuantity();

    if (newQty < minQty) {
      this.error.set(`Quantity cannot be less than received quantity (${minQty})`);
      return;
    }

    if (newQty <= 0) {
      this.error.set('Quantity must be greater than 0');
      return;
    }

    this.error.set('');
    this.save.emit({ itemId: this.item.id, newQuantity: newQty });
  }

  onQuantityChange(value: string): void {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      this.quantity.set(num);
    }
  }
}


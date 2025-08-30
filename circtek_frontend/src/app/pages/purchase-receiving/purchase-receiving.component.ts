import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFormPageComponent } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { PurchaseWithItemsAndReceived, ReceiveItemsRequest } from '../../core/models/purchase';
import { BarcodeScannerComponent, type ScanResult } from '../../shared/components/barcode-scanner/barcode-scanner.component';

@Component({
  selector: 'app-purchase-receiving',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent, BarcodeScannerComponent],
  templateUrl: './purchase-receiving.component.html',
  styleUrls: ['./purchase-receiving.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseReceivingComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // State
  purchase = signal<PurchaseWithItemsAndReceived | null>(null);
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  error = signal<string>('');
  form = signal<FormGroup>(this.createForm());

  // Computed
  title = computed(() => {
    const p = this.purchase();
    return p ? `Receive Items - PO ${p.purchase.purchase_order_no}` : 'Receive Items';
  });

  purchaseId = computed(() => {
    const p = this.purchase();
    return p?.purchase.id || 0;
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPurchase(parseInt(id));
    } else {
      this.error.set('Purchase ID is required');
      this.loading.set(false);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      warehouse_id: [null, Validators.required],
      items: this.fb.array([])
    });
  }

  private loadPurchase(id: number): void {
    this.loading.set(true);
    this.error.set('');

    this.api.getPurchase(id).subscribe({
      next: (response) => {
        if (response.status === 200 && response.data) {
          this.purchase.set(response.data);
          this.setupForm(response.data);
        } else {
          this.error.set(response.message || 'Failed to load purchase');
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set('Failed to load purchase');
        this.loading.set(false);
        console.error('Load purchase error:', error);
      }
    });
  }

  private setupForm(purchase: PurchaseWithItemsAndReceived): void {
    const itemsArray = this.fb.array(
      purchase.items.map(item => this.createItemFormGroup(item))
    );

    this.form.set(this.fb.group({
      warehouse_id: [purchase.purchase.warehouse_id, Validators.required],
      items: itemsArray
    }));
  }

  private createItemFormGroup(item: any): FormGroup {
    const remainingQty = item.remaining_quantity || 0;
    
    return this.fb.group({
      purchase_item_id: [item.id],
      sku: [item.sku],
      quantity_received: [remainingQty > 0 ? remainingQty : 0, [Validators.required, Validators.min(0)]],
      device_id: [null],
      identifiers: this.fb.array([]),
      is_part: [item.is_part || false],
      // Display fields
      ordered_quantity: [item.quantity],
      already_received: [item.received_quantity],
      remaining_quantity: [remainingQty]
    });
  }

  get itemsFormArray(): FormArray {
    return this.form().get('items') as FormArray;
  }

  getItemFormGroup(index: number): FormGroup {
    return this.itemsFormArray.at(index) as FormGroup;
  }

  getIdentifiersArray(index: number): FormArray {
    return this.getItemFormGroup(index).get('identifiers') as FormArray;
  }

  addIdentifier(itemIndex: number): void {
    const identifiersArray = this.getIdentifiersArray(itemIndex);
    identifiersArray.push(this.fb.control('', Validators.required));
  }

  removeIdentifier(itemIndex: number, identifierIndex: number): void {
    const identifiersArray = this.getIdentifiersArray(itemIndex);
    identifiersArray.removeAt(identifierIndex);
  }

  onDeviceScan(result: ScanResult, itemIndex: number): void {
    if (!result.isValid) return;

    const identifiersArray = this.getIdentifiersArray(itemIndex);
    const itemForm = this.getItemFormGroup(itemIndex);
    
    // Add the scanned identifier
    identifiersArray.push(this.fb.control(result.value, Validators.required));
    
    // Update quantity received to match number of identifiers
    const newQuantity = identifiersArray.length;
    itemForm.patchValue({ quantity_received: newQuantity });
  }

  onQuantityChange(itemIndex: number): void {
    const itemForm = this.getItemFormGroup(itemIndex);
    const identifiersArray = this.getIdentifiersArray(itemIndex);
    const newQuantity = itemForm.get('quantity_received')?.value || 0;
    const currentIdentifiers = identifiersArray.length;

    // For parts, adjust identifiers array to match quantity
    if (itemForm.get('is_part')?.value) {
      if (newQuantity > currentIdentifiers) {
        // Add empty identifiers
        for (let i = currentIdentifiers; i < newQuantity; i++) {
          identifiersArray.push(this.fb.control(''));
        }
      } else if (newQuantity < currentIdentifiers) {
        // Remove excess identifiers
        for (let i = currentIdentifiers - 1; i >= newQuantity; i--) {
          identifiersArray.removeAt(i);
        }
      }
    }
  }

  isItemPart(itemIndex: number): boolean {
    return this.getItemFormGroup(itemIndex).get('is_part')?.value === true;
  }

  onSubmit(): void {
    if (this.form().invalid || this.submitting()) return;

    this.submitting.set(true);
    this.error.set('');

    const formValue = this.form().value;
    const payload: Omit<ReceiveItemsRequest, 'purchase_id'> = {
      items: formValue.items.map((item: any) => ({
        purchase_item_id: item.purchase_item_id,
        sku: item.sku,
        quantity_received: item.quantity_received,
        device_id: item.device_id,
        identifiers: item.identifiers?.length > 0 ? item.identifiers : undefined
      })),
      warehouse_id: formValue.warehouse_id,
      actor_id: 1 // This should come from auth service
    };

    this.api.receivePurchaseItems(this.purchaseId(), payload).subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.router.navigate(['/stock-management'], { 
            queryParams: { tab: 'purchases' } 
          });
        } else {
          this.error.set(response.message || 'Failed to receive items');
        }
        this.submitting.set(false);
      },
      error: (error) => {
        this.error.set('Failed to receive items');
        this.submitting.set(false);
        console.error('Receive items error:', error);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/stock-management'], { 
      queryParams: { tab: 'purchases' } 
    });
  }

  // Helper methods for validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.form().get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  isItemFieldInvalid(itemIndex: number, fieldName: string): boolean {
    const field = this.getItemFormGroup(itemIndex).get(fieldName);
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

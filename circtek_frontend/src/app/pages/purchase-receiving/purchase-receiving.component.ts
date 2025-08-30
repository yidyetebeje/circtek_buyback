import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFormPageComponent } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { PurchaseWithItemsAndReceived, ReceiveItemsRequest } from '../../core/models/purchase';
import { BarcodeScannerComponent, type ScanResult } from '../../shared/components/barcode-scanner/barcode-scanner.component';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';

@Component({
  selector: 'app-purchase-receiving',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent, BarcodeScannerComponent, FileUploadComponent],
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
  showDocuments = signal<boolean>(false);
  selectedDocument = signal<string | null>(null);
  warehouses = signal<any[]>([]);

  // Computed
  title = computed(() => {
    const p = this.purchase();
    return p ? `Receive Items - PO ${p.purchase.purchase_order_no}` : 'Receive Items';
  });

  purchaseId = computed(() => {
    const p = this.purchase();
    return p?.purchase.id || 0;
  });

  progressPercentage = computed(() => {
    const p = this.purchase();
    if (!p || p.total_items === 0) return 0;
    return Math.round((p.total_received / p.total_items) * 100);
  });

  availableDocuments = computed(() => {
    const p = this.purchase();
    if (!p) return [];
    
    const docs = [];
    if (p.purchase.invoice) docs.push({ name: 'Invoice', url: p.purchase.invoice, type: 'invoice' });
    if (p.purchase.transport_doc) docs.push({ name: 'Transport Document', url: p.purchase.transport_doc, type: 'transport' });
    if (p.purchase.receiving_picture) docs.push({ name: 'Receiving Picture', url: p.purchase.receiving_picture, type: 'image' });
    if (p.purchase.order_confirmation_doc) docs.push({ name: 'Order Confirmation', url: p.purchase.order_confirmation_doc, type: 'confirmation' });
    
    return docs;
  });

  totalItemsToReceive = computed(() => {
    const items = this.form().get('items')?.value || [];
    return items.reduce((total: number, item: any) => total + (item.quantity_received || 0), 0);
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPurchase(parseInt(id));
      this.loadWarehouses();
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

  private loadWarehouses(): void {
    this.api.getWarehouses().subscribe({
      next: (response) => {
        if (response.status === 200 && response.data) {
          this.warehouses.set(response.data);
        }
      },
      error: (error) => {
        console.error('Failed to load warehouses:', error);
      }
    });
  }

  private setupForm(purchase: PurchaseWithItemsAndReceived): void {
    const itemsArray = this.fb.array(
      purchase.items.filter(item => item.remaining_quantity > 0).map(item => this.createItemFormGroup(item))
    );

    this.form.set(this.fb.group({
      warehouse_id: [purchase.purchase.warehouse_id, Validators.required],
      items: itemsArray,
      receiving_picture: [null]
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

  // Document handling methods
  toggleDocuments(): void {
    this.showDocuments.update(show => !show);
  }

  viewDocument(doc: any): void {
    this.selectedDocument.set(doc.url);
    // Open in new tab
    window.open(doc.url, '_blank');
  }


  // Enhanced validation methods
  getTotalQuantityError(itemIndex: number): string | null {
    const itemForm = this.getItemFormGroup(itemIndex);
    const quantityReceived = itemForm.get('quantity_received')?.value || 0;
    const remainingQuantity = itemForm.get('remaining_quantity')?.value || 0;
    
    if (quantityReceived > remainingQuantity) {
      return `Cannot receive more than ${remainingQuantity} items`;
    }
    return null;
  }

  isFormValid(): boolean {
    const form = this.form();
    if (!form.valid) return false;
    
    // Check if at least one item has quantity > 0
    const items = form.get('items')?.value || [];
    return items.some((item: any) => (item.quantity_received || 0) > 0);
  }

  getFormSummary(): { totalItems: number; totalQuantity: number; itemsWithQuantity: number } {
    const items = this.form().get('items')?.value || [];
    return {
      totalItems: items.length,
      totalQuantity: items.reduce((sum: number, item: any) => sum + (item.quantity_received || 0), 0),
      itemsWithQuantity: items.filter((item: any) => (item.quantity_received || 0) > 0).length
    };
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFormPageComponent } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { PurchaseWithItemsAndReceived, ReceiveItemsRequest } from '../../core/models/purchase';
import { Warehouse } from '../../core/models/warehouse';
import { BarcodeScannerComponent, type ScanResult } from '../../shared/components/barcode-scanner/barcode-scanner.component';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';

@Component({
  selector: 'app-receive-items',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent, BarcodeScannerComponent, FileUploadComponent],
  templateUrl: './receive-items.component.html',
  styleUrls: ['./receive-items.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceiveItemsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Form and data signals
  protected readonly form = signal<FormGroup>(this.createForm());
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly purchases = signal<PurchaseWithItemsAndReceived[]>([]);
  protected readonly warehouses = signal<Warehouse[]>([]);
  protected readonly selectedPurchase = signal<PurchaseWithItemsAndReceived | null>(null);
  protected readonly availableItems = signal<any[]>([]);
  

  // Computed
  title = computed(() => 'Receive Items');
  
  subtitle = computed(() => {
    const purchase = this.selectedPurchase();
    return purchase ? `PO: ${purchase.purchase.purchase_order_no} - ${purchase.purchase.supplier_name}` : 'Select a purchase order to receive items';
  });

  purchaseOptions = computed(() => {
    return this.purchases()
      .filter(p => !p.is_fully_received)
      .map(p => ({
        value: p.purchase.id,
        label: `${p.purchase.purchase_order_no} - ${p.purchase.supplier_name} (${p.total_received}/${p.total_items} received)`
      }));
  });

  availableItemOptions = computed(() => {
    return this.availableItems().map(item => ({
      value: item.id,
      label: `${item.sku} - Remaining: ${item.remaining_quantity}`
    }));
  });

  warehouseOptions = computed(() => {
    return this.warehouses().map(w => ({
      value: w.id,
      label: w.name
    }));
  });

  constructor() {
    this.loadInitialData();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      purchase_id: [null, Validators.required],
      selected_item_id: [null, Validators.required],
      warehouse_id: [null, Validators.required],
      quantity_received: [0, [Validators.required, Validators.min(1)]],
      device_id: [null],
      identifiers: this.fb.array([]),
      receiving_picture: [null]
    });
  }




  protected isCurrentItemValid(): boolean {
    const formValue = this.form().value as any;
    const itemId = formValue.selected_item_id;
    const qty = Number(formValue.quantity_received || 0);
    if (!itemId || qty <= 0) return false;

    const selectedItem = this.getSelectedItem();
    if (!selectedItem) return false;

    if (qty > selectedItem.remaining_quantity) return false;

    if (!selectedItem.is_part) {
      const ids: string[] = (this.identifiersArray.value as string[]).map(v => (v || '').trim()).filter(Boolean);
      // quantity must match identifiers count for devices
      if (ids.length !== qty) return false;
      // ensure no duplicates within current identifiers
      const set = new Set(ids);
      if (set.size !== ids.length) return false;
    }
    return true;
  }

  private loadInitialData(): void {
    this.loading.set(true);
    
    // Load both purchases and warehouses in parallel
    Promise.all([
      this.api.getPurchases().toPromise(),
      this.api.getWarehouses().toPromise()
    ]).then(([purchasesResponse, warehousesResponse]) => {
      // Handle purchases
      if (purchasesResponse?.data) {
        const transformedPurchases = purchasesResponse.data.map((purchase: any) => ({
          purchase: purchase,
          items: [],
          total_items: 0,
          total_received: 0,
          is_fully_received: false
        }));
        this.purchases.set(transformedPurchases);
        
        // Auto-select purchase if ID provided in query params
        const purchaseId = this.route.snapshot.queryParams['purchaseId'];
        if (purchaseId) {
          const selectedPurchase = transformedPurchases.find((p: any) => p.purchase.id === parseInt(purchaseId));
          if (selectedPurchase) {
            this.form().patchValue({ purchase_id: selectedPurchase.purchase.id });
            // Load purchase details but don't set loading to false yet
            this.onPurchaseSelected(selectedPurchase.purchase.id);
            return; // Exit early, onPurchaseSelected will handle loading state
          }
        }
      }
      
      // Handle warehouses
      if (warehousesResponse?.data) {
        this.warehouses.set(warehousesResponse.data);
      }
      
      // Only set loading to false if we're not auto-selecting a purchase
      this.loading.set(false);
    }).catch(error => {
      console.error('Error loading initial data:', error);
      this.error.set('Failed to load data');
      this.loading.set(false);
    });
  }

  onPurchaseSelected(purchaseId: number): void {
    this.loading.set(true);
    this.error.set(''); // Clear any previous errors
    
    // Fetch detailed purchase with items
    this.api.getPurchase(purchaseId).subscribe({
      next: (response) => {
        if (response.data) {
          this.selectedPurchase.set(response.data);
          this.availableItems.set(response.data.items.filter(item => item.remaining_quantity > 0));
          
          // Set default warehouse
          this.form().patchValue({ 
            warehouse_id: response.data.purchase.warehouse_id,
            selected_item_id: null,
            quantity_received: 0
          });
          
          // Clear identifiers
          this.clearIdentifiers();
        } else {
          this.error.set('Purchase not found');
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading purchase details:', error);
        this.error.set('Failed to load purchase details');
        this.loading.set(false);
      }
    });
  }

  onItemSelected(itemId: number): void {
    const item = this.availableItems().find(i => i.id === itemId);
    if (item) {
      this.form().patchValue({ 
        quantity_received: item.is_part ? item.remaining_quantity : 0 
      });
      
      // Clear and setup identifiers based on item type
      this.clearIdentifiers();
      this.error.set('');
      if (!item.is_part) {
        // For devices, prepare for scanning
        this.addIdentifier();
      }
    }
  }

  get identifiersArray(): FormArray {
    return this.form().get('identifiers') as FormArray;
  }

  addIdentifier(): void {
    this.identifiersArray.push(this.fb.control('', Validators.required));
  }

  removeIdentifier(index: number): void {
    this.identifiersArray.removeAt(index);
  }

  clearIdentifiers(): void {
    while (this.identifiersArray.length !== 0) {
      this.identifiersArray.removeAt(0);
    }
  }

  onDeviceScan(result: ScanResult): void {
    if (!result.isValid) return;

    const selectedItem = this.getSelectedItem();
    if (!selectedItem || selectedItem.is_part) return;

    const value = (result.value || '').trim();
    if (!value) return;

    // Prevent duplicates in current list
    const inCurrent = (this.identifiersArray.value as string[]).some(v => (v || '').trim() === value);
    if (inCurrent) {
      this.error.set('Duplicate identifier scanned');
      return;
    }

    // Prevent exceeding remaining quantity
    const nextCount = this.identifiersArray.length + 1;
    if (nextCount > selectedItem.remaining_quantity) {
      this.error.set(`Cannot scan more than remaining quantity (${selectedItem.remaining_quantity})`);
      return;
    }

    // Fill first empty slot if exists, else add new
    let placed = false;
    for (let i = 0; i < this.identifiersArray.length; i++) {
      const curr = (this.identifiersArray.at(i).value || '').trim();
      if (!curr) {
        this.identifiersArray.at(i).setValue(value);
        placed = true;
        break;
      }
    }
    if (!placed) {
      this.addIdentifier();
      const lastIndex = this.identifiersArray.length - 1;
      this.identifiersArray.at(lastIndex).setValue(value);
    }

    // Update quantity to match number of non-empty identifiers
    const nonEmptyCount = (this.identifiersArray.value as string[]).map(v => (v || '').trim()).filter(Boolean).length;
    this.form().patchValue({ 
      quantity_received: nonEmptyCount 
    });

    // Clear any previous errors since we have valid scan data
    this.error.set('');
  }

  onQuantityChange(): void {
    const selectedItem = this.getSelectedItem();
    const quantity = this.form().get('quantity_received')?.value || 0;
    
    if (!selectedItem) return;

    // For parts, adjust identifiers array to match quantity
    if (selectedItem.is_part) {
      const currentIdentifiers = this.identifiersArray.length;
      
      if (quantity > currentIdentifiers) {
        // Add empty identifiers
        for (let i = currentIdentifiers; i < quantity; i++) {
          this.addIdentifier();
        }
      } else if (quantity < currentIdentifiers) {
        // Remove excess identifiers
        for (let i = currentIdentifiers - 1; i >= quantity; i--) {
          this.removeIdentifier(i);
        }
      }
    }
  }

  getSelectedItem(): any {
    const itemId = this.form().get('selected_item_id')?.value;
    return this.availableItems().find(item => item.id === itemId);
  }


  isItemPart(): boolean {
    const selectedItem = this.getSelectedItem();
    return selectedItem?.is_part === true;
  }

  onSubmit(): void {
    if (this.submitting()) return;

    const formValue = this.form().value;
    if (!formValue.purchase_id || !formValue.warehouse_id || !formValue.selected_item_id) {
      this.error.set('Please select purchase order, warehouse, and item');
      return;
    }

    const selectedItem = this.getSelectedItem();
    if (!selectedItem) {
      this.error.set('Selected item not found');
      return;
    }

    const qty = Number(formValue.quantity_received || 0);
    if (qty <= 0) {
      this.error.set('Please enter a valid quantity');
      return;
    }

    if (qty > selectedItem.remaining_quantity) {
      this.error.set(`Cannot receive more than remaining quantity (${selectedItem.remaining_quantity})`);
      return;
    }

    // Validate identifiers for devices
    const ids: string[] = (formValue.identifiers || []).map((v: string) => (v || '').trim()).filter(Boolean);
    if (!selectedItem.is_part) {
      if (ids.length !== qty) {
        this.error.set('Identifiers count must match quantity for devices');
        return;
      }
      const set = new Set(ids);
      if (set.size !== ids.length) {
        this.error.set('Duplicate identifiers found');
        return;
      }
    }

    this.submitting.set(true);
    this.error.set('');

    const payload = {
      purchase_id: formValue.purchase_id,
      items: [{
        purchase_item_id: selectedItem.id,
        sku: selectedItem.sku,
        quantity_received: qty,
        device_id: formValue.device_id,
        identifiers: ids.length > 0 ? ids : undefined
      }],
      warehouse_id: formValue.warehouse_id,
      actor_id: 1 // This should come from auth service
    };

    this.api.receivePurchaseItems(payload).subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.router.navigate(['/stock-management/purchases', formValue.purchase_id]);
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
    const purchaseId = this.form().get('purchase_id')?.value;
    if (purchaseId) {
      this.router.navigate(['/stock-management/purchases', purchaseId]);
    } else {
      this.router.navigate(['/stock-management'], { 
        queryParams: { tab: 'purchases' } 
      });
    }
  }

  // Form field configuration for GenericFormPageComponent
  fields = computed(() => [
    {
      key: 'purchase_id',
      label: 'Purchase Order',
      type: 'select' as const,
      required: true,
      options: this.purchaseOptions()
    },
    {
      key: 'selected_item_id',
      label: 'Item to Receive',
      type: 'select' as const,
      required: true,
      options: this.availableItemOptions(),
      disabled: !this.selectedPurchase()
    },
    {
      key: 'warehouse_id',
      label: 'Receiving Warehouse',
      type: 'select' as const,
      required: true,
      options: this.warehouseOptions()
    },
    {
      key: 'quantity_received',
      label: 'Quantity to Receive',
      type: 'number' as const,
      required: true,
      validation: { min: 1 }
    }
  ]);

  actions = computed(() => [
    {
      label: 'Cancel',
      type: 'button' as const,
      variant: 'secondary' as const,
      action: () => this.onCancel()
    }
  ]);

  // Handle form field changes
  onFieldChange(field: string, value: any): void {
    if (field === 'purchase_id') {
      this.onPurchaseSelected(value);
    } else if (field === 'selected_item_id') {
      this.onItemSelected(value);
    } else if (field === 'quantity_received') {
      this.onQuantityChange();
    }
  }

  onActionClick(action: any): void {
    if (action.action) {
      action.action();
    }
  }
}

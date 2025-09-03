import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, QrCode, Plus, Trash2 } from 'lucide-angular';
import { GenericFormPageComponent } from '../../shared/components/generic-form-page/generic-form-page.component';
import { BarcodeScannerComponent, ScanResult } from '../../shared/components/barcode-scanner/barcode-scanner.component';
import { ApiService } from '../../core/services/api.service';
import { PurchaseWithItems, ReceiveItemsRequest, ReceiveItemsRequestItem } from '../../core/models/purchase';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-product-receive',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericFormPageComponent,
    BarcodeScannerComponent,
    LucideAngularModule
  ],
  templateUrl: './product-receive.component.html',
  styleUrls: ['./product-receive.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductReceiveComponent {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // Icons
  readonly QrCode = QrCode;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;

  // Signals
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly purchases = signal<PurchaseWithItems[]>([]);
  protected readonly selectedPurchase = signal<PurchaseWithItems | null>(null);
  protected readonly warehouses = signal<any[]>([]);

  // Form
  protected readonly form = this.fb.group({
    purchase_id: ['', [Validators.required]],
    warehouse_id: ['', [Validators.required]],
    items: this.fb.array([])
  });

  // Computed values
  protected readonly purchaseOptions = computed(() => {
    return this.purchases()
      .filter(p => !p.is_fully_received)
      .map(p => ({
        label: `${p.purchase.purchase_order_no} - ${p.purchase.supplier_name}`,
        value: p.purchase.id
      }));
  });

  protected readonly availableSkus = computed(() => {
    const purchase = this.selectedPurchase();
    if (!purchase) return [];
    
    return purchase.items
      .filter(item => item.remaining_quantity > 0)
      .map(item => ({
        label: `${item.sku} (${item.remaining_quantity} remaining)`,
        value: item.sku,
        item: item
      }));
  });

  protected readonly itemsFormArray = computed(() => {
    return this.form.get('items') as FormArray;
  });

  constructor() {
    this.loadInitialData();
    this.setupFormSubscriptions();
  }

  private async loadInitialData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Load purchases with items (not fully received)
      const purchasesResponse = await this.apiService.getPurchasesWithItems().toPromise();
      if (purchasesResponse?.data) {
        this.purchases.set(purchasesResponse.data);
      }

      // Load warehouses
      const warehousesResponse = await this.apiService.getWarehouses().toPromise();
      if (warehousesResponse?.data) {
        this.warehouses.set(warehousesResponse.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.error.set('Failed to load data. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private setupFormSubscriptions() {
    // Watch for purchase selection changes
    this.form.get('purchase_id')?.valueChanges.subscribe(purchaseId => {
      if (purchaseId) {
        const purchase = this.purchases().find(p => p.purchase.id === Number(purchaseId));
        this.selectedPurchase.set(purchase || null);
        
        // Clear existing items when purchase changes
        this.clearItems();
        
        // Set warehouse_id from purchase if available
        if (purchase?.purchase.warehouse_id) {
          this.form.patchValue({ warehouse_id: String(purchase.purchase.warehouse_id) });
        }
      } else {
        this.selectedPurchase.set(null);
        this.clearItems();
      }
    });
  }

  protected onSkuSelected(sku: string) {
    const purchase = this.selectedPurchase();
    if (!purchase) return;

    const purchaseItem = purchase.items.find(item => item.sku === sku);
    if (!purchaseItem) return;

    // Check if this SKU is already added
    const existingIndex = this.itemsFormArray().controls.findIndex(
      control => control.get('sku')?.value === sku
    );

    if (existingIndex >= 0) {
      this.error.set('This SKU is already selected');
      return;
    }

    // Add new item form group
    const quantityControl = this.fb.control(
      { value: 0, disabled: !purchaseItem.is_part },
      purchaseItem.is_part ? [Validators.required, Validators.min(1), Validators.max(purchaseItem.remaining_quantity)] : []
    );

    const itemGroup = this.fb.group({
      purchase_item_id: [purchaseItem.id, [Validators.required]],
      sku: [sku, [Validators.required]],
      quantity_received: quantityControl,
      is_part: [purchaseItem.is_part],
      remaining_quantity: [purchaseItem.remaining_quantity],
      identifiers: this.fb.array([])
    });

    this.itemsFormArray().push(itemGroup);
    this.error.set(null);
  }

  protected removeItem(index: number) {
    this.itemsFormArray().removeAt(index);
  }

  protected clearItems() {
    while (this.itemsFormArray().length !== 0) {
      this.itemsFormArray().removeAt(0);
    }
  }

  protected getIdentifiersArray(itemIndex: number): FormArray {
    return this.itemsFormArray().at(itemIndex).get('identifiers') as FormArray;
  }

  protected addIdentifier(itemIndex: number, identifier: string) {
    if (!identifier.trim()) return;

    const identifiersArray = this.getIdentifiersArray(itemIndex);
    const itemGroup = this.itemsFormArray().at(itemIndex);
    
    // Check for duplicates
    const existing = identifiersArray.controls.find(
      control => control.value === identifier.trim()
    );
    
    if (existing) {
      this.error.set('This identifier is already added');
      return;
    }

    identifiersArray.push(this.fb.control(identifier.trim()));
    
    // Update quantity_received for devices
    const isPartControl = itemGroup.get('is_part');
    if (isPartControl && !isPartControl.value) {
      itemGroup.get('quantity_received')?.setValue(identifiersArray.length);
    }
    
    this.error.set(null);
  }

  protected removeIdentifier(itemIndex: number, identifierIndex: number) {
    const identifiersArray = this.getIdentifiersArray(itemIndex);
    const itemGroup = this.itemsFormArray().at(itemIndex);
    
    identifiersArray.removeAt(identifierIndex);
    
    // Update quantity_received for devices
    const isPartControl = itemGroup.get('is_part');
    if (isPartControl && !isPartControl.value) {
      itemGroup.get('quantity_received')?.setValue(identifiersArray.length);
    }
  }

  protected onScanResult(itemIndex: number, result: ScanResult) {
    if (result.isValid) {
      this.addIdentifier(itemIndex, result.value);
    } else {
      this.error.set(`Invalid scan result: ${result.value}`);
    }
  }

  protected async onSubmit() {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      const formValue = this.form.value;
      const currentUser = this.authService.currentUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const items: ReceiveItemsRequestItem[] = formValue.items!.map((item: any) => ({
        purchase_item_id: item.purchase_item_id,
        sku: item.sku,
        quantity_received: item.identifiers?.length > 0 ? item.identifiers.length : (item.quantity_received || 0),
        ...(item.identifiers?.length > 0 && { identifiers: item.identifiers })
      }));

      const payload: ReceiveItemsRequest = {
        purchase_id: Number(formValue.purchase_id),
        items,
        warehouse_id: Number(formValue.warehouse_id),
        actor_id: currentUser.id
      };

      const response = await this.apiService.receiveItems(
        Number(formValue.purchase_id),
        payload
      ).toPromise();

      if (response?.status === 200) {
        // Navigate back to stock management with purchases tab
        this.router.navigate(['/stock-management'], { 
          queryParams: { tab: 'purchases' } 
        });
      } else {
        throw new Error(response?.message || 'Failed to receive items');
      }
    } catch (error) {
      console.error('Error receiving items:', error);
      this.error.set(error instanceof Error ? error.message : 'Failed to receive items');
    } finally {
      this.submitting.set(false);
    }
  }

  protected onCancel() {
    this.router.navigate(['/stock-management'], { 
      queryParams: { tab: 'purchases' } 
    });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach((arrayControl, index) => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          } else {
            arrayControl.markAsTouched({ onlySelf: true });
          }
        });
      }
    });
  }
}

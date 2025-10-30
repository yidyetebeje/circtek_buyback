import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);
  private readonly autoSelectedPurchaseId = signal<number | null>(null);

  // Custom validators
  static positiveNumberValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null; // Let required validator handle empty values
    }
    
    const stringValue = String(value);
    
    // Check for invalid characters like '+' at the beginning or other invalid patterns
    if (stringValue.startsWith('+') || stringValue.startsWith('-') || 
        stringValue.includes('e') || stringValue.includes('E') || 
        stringValue.includes('.') || isNaN(Number(value)) || 
        Number(value) <= 0 || !Number.isInteger(Number(value))) {
      return { invalidFormat: true };
    }
    
    return null;
  }
  
  static imeiSerialValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value || value.trim() === '') {
      return null; // Let required validator handle empty values
    }
    
    const trimmedValue = value.trim();
    
    // Check for minimum and maximum length (IMEI is typically 15 digits, but allow serial numbers too)
    if (trimmedValue.length < 8 || trimmedValue.length > 20) {
      return { invalidLength: true };
    }
    
    // Check for valid characters (alphanumeric only)
    if (!/^[A-Za-z0-9]+$/.test(trimmedValue)) {
      return { invalidCharacters: true };
    }
    
    return null;
  }

  // Icons
  readonly QrCode = QrCode;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;

  // Signals
  protected readonly loading = signal(false);
  protected readonly loadingSpecificPurchase = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly purchases = signal<PurchaseWithItems[]>([]);
  protected readonly selectedPurchase = signal<PurchaseWithItems | null>(null);
  protected readonly loadingMessage = signal<string>('Loading...');

  // Form
  protected readonly form = this.fb.group({
    purchase_id: ['', [Validators.required]],
    items: this.fb.array([], [Validators.minLength(1)])
  });

  // Computed values
  protected readonly purchaseOptions = computed(() => {
    const purchases = this.purchases();
    const autoSelectedId = this.autoSelectedPurchaseId();
    
    // Include not fully received purchases, plus the auto-selected one if it exists
    const filteredPurchases = purchases.filter(p => {
      const isNotFullyReceived = !this.calculateIsFullyReceived(p);
      const isAutoSelected = autoSelectedId && p.purchase.id === autoSelectedId;
      return isNotFullyReceived || isAutoSelected;
    });
    
    return filteredPurchases.map(p => ({
      label: `${p.purchase.supplier_order_no} - ${p.purchase.supplier_name}`,
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

  // Computed value to show auto-selection status
  protected readonly autoSelectionMessage = computed(() => {
    const autoSelectedId = this.autoSelectedPurchaseId();
    const selectedPurchase = this.selectedPurchase();
    
    if (autoSelectedId && selectedPurchase && selectedPurchase.purchase.id === autoSelectedId) {
      return `Automatically selected Purchase Order: ${selectedPurchase.purchase.supplier_order_no} - ${selectedPurchase.purchase.supplier_name}`;
    }
    
    return null;
  });

  constructor() {
    this.loadInitialData();
    this.setupFormSubscriptions();
  }

  private async loadInitialData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const purchaseIdParam = this.route.snapshot.queryParams['purchaseId'];
      
      if (purchaseIdParam) {
        this.loadingMessage.set(`Loading Purchase Order ${purchaseIdParam}...`);
        // Optimized path: fetch specific purchase directly
        await this.loadSpecificPurchaseAndList(Number(purchaseIdParam));
      } else {
        this.loadingMessage.set('Loading available purchases...');
        // Standard path: load paginated purchases
        await this.loadPaginatedPurchases();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.error.set('Failed to load data. Please try again.');
    } finally {
      this.loading.set(false);
      this.loadingSpecificPurchase.set(false);
    }
  }

  private async loadSpecificPurchaseAndList(purchaseId: number) {
    this.autoSelectedPurchaseId.set(purchaseId);
    this.loadingSpecificPurchase.set(true);
    
    try {
      // Fetch the specific purchase directly
      const specificPurchaseResponse = await this.apiService.getPurchaseWithItemsById(purchaseId).toPromise();
      
      if (specificPurchaseResponse?.status === 200 && specificPurchaseResponse.data) {
        const targetPurchase = specificPurchaseResponse.data;
        
        // Check if purchase can be received
        const isFullyReceived = this.calculateIsFullyReceived(targetPurchase);
        
        if (!isFullyReceived) {
          this.loadingMessage.set('Loading additional purchases...');
          
          // Load the paginated list to populate the dropdown
          const purchasesResponse = await this.apiService.getPurchasesWithItems().toPromise();
          let allPurchases = purchasesResponse?.data || [];
          
          // If the specific purchase isn't in the paginated results, add it
          const existsInList = allPurchases.some(p => p.purchase.id === purchaseId);
          if (!existsInList) {
            allPurchases = [targetPurchase, ...allPurchases];
          }
          
          this.purchases.set(allPurchases);
          
          // Auto-select the purchase
          this.form.patchValue({ purchase_id: String(purchaseId) });
          this.selectedPurchase.set(targetPurchase);
          
         
        } else {
          // Purchase is fully received
          this.error.set(`Purchase Order ${targetPurchase.purchase.supplier_order_no} has been fully received and cannot receive more items.`);
          this.loadingMessage.set('Loading available purchases...');
          // Still load the paginated list for manual selection
          await this.loadPaginatedPurchases();
        }
      } else {
        // Purchase not found or access denied
        this.error.set(`Purchase Order ID ${purchaseId} not found or you don't have access to it.`);
        this.loadingMessage.set('Loading available purchases...');
        // Fallback to loading paginated purchases
        await this.loadPaginatedPurchases();
      }
    } catch (error) {
      console.error('Error loading specific purchase:', error);
      // Fallback to loading paginated purchases
      this.error.set(`Could not load Purchase Order ID ${purchaseId}. Loading available purchases...`);
      this.loadingMessage.set('Loading available purchases...');
      await this.loadPaginatedPurchases();
    } finally {
      this.loadingSpecificPurchase.set(false);
    }
  }

  private async loadPaginatedPurchases() {
    try {
      const purchasesResponse = await this.apiService.getPurchasesWithItems().toPromise();
      if (purchasesResponse?.data) {
        this.purchases.set(purchasesResponse.data);
      }
    } catch (error) {
      console.error('Error loading paginated purchases:', error);
      throw error; // Re-throw to be handled by the caller
    }
  }

  private calculateIsFullyReceived(purchase: PurchaseWithItems): boolean {
    if (!purchase.items || purchase.items.length === 0) return false;
    
    const totalOrdered = purchase.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalReceived = purchase.items.reduce((sum, item) => sum + (item.received_quantity || 0), 0);
    
    return totalReceived >= totalOrdered;
  }

  private setupFormSubscriptions() {
    // Watch for purchase selection changes
    this.form.get('purchase_id')?.valueChanges.subscribe(purchaseId => {
      if (purchaseId) {
        const purchase = this.purchases().find(p => p.purchase.id === Number(purchaseId));
        this.selectedPurchase.set(purchase || null);
        
        // Clear existing items when purchase changes
        this.clearItems();
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
      0, // Always start with enabled control and value 0
      purchaseItem.is_part ? [
        Validators.required, 
        Validators.min(1), 
        Validators.max(purchaseItem.remaining_quantity),
        ProductReceiveComponent.positiveNumberValidator
      ] : []
    );
    
    // For devices, disable the quantity control since it's calculated from identifiers
    if (!purchaseItem.is_part) {
      quantityControl.disable();
    }

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

    const trimmedIdentifier = identifier.trim();
    
    // Validate identifier format
    const validationResult = ProductReceiveComponent.imeiSerialValidator(
      this.fb.control(trimmedIdentifier)
    );
    
    if (validationResult) {
      if (validationResult['invalidLength']) {
        this.error.set('Identifier must be between 8 and 20 characters long');
      } else if (validationResult['invalidCharacters']) {
        this.error.set('Identifier can only contain letters and numbers');
      }
      return;
    }

    const identifiersArray = this.getIdentifiersArray(itemIndex);
    const itemGroup = this.itemsFormArray().at(itemIndex);
    
    // Check for duplicates
    const existing = identifiersArray.controls.find(
      control => control.value === trimmedIdentifier
    );
    
    if (existing) {
      this.error.set('This identifier is already added');
      return;
    }

    identifiersArray.push(this.fb.control(trimmedIdentifier));
    
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
    // Mark all controls as touched to show validation errors
    this.markFormGroupTouched(this.form);
    
    if (this.form.invalid) {
      // Provide specific error messages
      const purchaseIdControl = this.form.get('purchase_id');
      const itemsArray = this.form.get('items') as FormArray;
      
      if (purchaseIdControl?.invalid) {
        this.error.set('Please select a purchase order');
        return;
      }
      
      if (itemsArray?.invalid || itemsArray?.length === 0) {
        this.error.set('Please select at least one SKU to receive');
        return;
      }
      
      // Check for invalid items
      for (let i = 0; i < itemsArray.length; i++) {
        const itemGroup = itemsArray.at(i) as FormGroup;
        const quantityControl = itemGroup.get('quantity_received');
        const isPartControl = itemGroup.get('is_part');
        const identifiersArray = itemGroup.get('identifiers') as FormArray;
        const skuValue = itemGroup.get('sku')?.value;
        
        if (isPartControl?.value && quantityControl?.invalid) {
          this.error.set(`Please enter a valid quantity for SKU: ${skuValue}`);
          return;
        }
        
        if (!isPartControl?.value && identifiersArray?.length === 0) {
          this.error.set(`Please scan at least one identifier for SKU: ${skuValue}`);
          return;
        }
      }
      
      this.error.set('Please correct the validation errors before submitting');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      const formValue = this.form.value;
      const currentUser = this.authService.currentUser();
      const selectedPurchase = this.selectedPurchase();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!selectedPurchase) {
        throw new Error('No purchase selected');
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
        warehouse_id: selectedPurchase.purchase.warehouse_id,
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
    // If we came from a specific purchase detail page, navigate back to it
    const autoSelectedId = this.autoSelectedPurchaseId();
    if (autoSelectedId) {
      this.router.navigate(['/stock-management/purchases', autoSelectedId]);
    } else {
      // Otherwise go to stock management with purchases tab
      this.router.navigate(['/stock-management'], { 
        queryParams: { tab: 'purchases' } 
      });
    }
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

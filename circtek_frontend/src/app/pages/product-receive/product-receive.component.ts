import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule, QrCode, Plus, Trash2, ChevronDown, ChevronUp, Package, Smartphone, CheckCircle2 } from 'lucide-angular';
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
    // Allow 0 or positive integers
    if (stringValue.startsWith('+') || stringValue.startsWith('-') || 
        stringValue.includes('e') || stringValue.includes('E') || 
        stringValue.includes('.') || isNaN(Number(value)) || 
        Number(value) < 0 || !Number.isInteger(Number(value))) {
      return { invalidFormat: true };
    }
    
    return null;
  }

  static maxRemainingValidator(remainingQuantity: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (value === null || value === undefined || value === '') {
        return null;
      }
      
      if (Number(value) > remainingQuantity) {
        return { exceedsRemaining: { max: remainingQuantity, actual: value } };
      }
      
      return null;
    };
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
  readonly ChevronDown = ChevronDown;
  readonly ChevronUp = ChevronUp;
  readonly Package = Package;
  readonly Smartphone = Smartphone;
  readonly CheckCircle2 = CheckCircle2;

  // Signals
  protected readonly loading = signal(false);
  protected readonly loadingSpecificPurchase = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly purchases = signal<PurchaseWithItems[]>([]);
  protected readonly selectedPurchase = signal<PurchaseWithItems | null>(null);
  protected readonly loadingMessage = signal<string>('Loading...');
  // Signal to force reactivity when form changes
  private readonly formChangesTrigger = signal(0);

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


  protected readonly itemsFormArray = computed(() => {
    return this.form.get('items') as FormArray;
  });

  // Separate parts and devices for better UI organization
  protected readonly partsItems = computed(() => {
    return this.itemsFormArray().controls.filter(
      control => control.get('is_part')?.value === true
    );
  });

  protected readonly deviceItems = computed(() => {
    return this.itemsFormArray().controls.filter(
      control => control.get('is_part')?.value === false
    );
  });

  // All items sorted: parts first, then devices
  protected readonly allItems = computed(() => {
    const parts = this.partsItems();
    const devices = this.deviceItems();
    return [...parts, ...devices];
  });

  // Progress tracking
  protected readonly receiveProgress = computed(() => {
    this.formChangesTrigger(); // Include trigger in dependencies
    const items = this.itemsFormArray().controls;
    const selectedItems = items.filter(control => control.get('selected')?.value === true);
    
    if (selectedItems.length === 0) return { completed: 0, total: items.length, percentage: 0 };
    
    const completed = selectedItems.filter(control => {
      const isPart = control.get('is_part')?.value;
      const quantity = control.get('quantity_received')?.value;
      const identifiers = (control.get('identifiers') as FormArray).length;
      
      if (isPart) {
        return quantity > 0;
      } else {
        return identifiers > 0;
      }
    }).length;
    
    return {
      completed,
      total: items.length,
      percentage: Math.round((completed / selectedItems.length) * 100)
    };
  });

  // Check if all items are selected
  protected readonly allItemsSelected = computed(() => {
    this.formChangesTrigger(); // Include trigger in dependencies
    const items = this.itemsFormArray().controls;
    if (items.length === 0) return false;
    return items.every(control => control.get('selected')?.value === true);
  });

  // Check if any items are selected
  protected readonly anyItemsSelected = computed(() => {
    this.formChangesTrigger(); // Include trigger in dependencies
    const items = this.itemsFormArray().controls;
    if (items.length === 0) return false;
    return items.some(control => control.get('selected')?.value === true);
  });

  // Get count of selected items
  protected readonly selectedItemsCount = computed(() => {
    this.formChangesTrigger(); // Include trigger in dependencies
    const items = this.itemsFormArray().controls;
    return items.filter(control => control.get('selected')?.value === true).length;
  });

  // Trigger form change detection
  private triggerFormChange() {
    this.formChangesTrigger.update(v => v + 1);
  }

  // Select/Unselect all items
  protected selectAllItems() {
    this.itemsFormArray().controls.forEach(control => {
      control.get('selected')?.setValue(true);
    });
    this.triggerFormChange();
  }

  protected unselectAllItems() {
    this.itemsFormArray().controls.forEach(control => {
      control.get('selected')?.setValue(false);
    });
    this.triggerFormChange();
  }

  protected toggleSelectAll() {
    if (this.allItemsSelected()) {
      this.unselectAllItems();
    } else {
      this.selectAllItems();
    }
  }

  // Expanded device rows tracking
  protected readonly expandedDevices = signal<Set<number>>(new Set());

  protected toggleDeviceExpanded(index: number) {
    const expanded = new Set(this.expandedDevices());
    if (expanded.has(index)) {
      expanded.delete(index);
    } else {
      expanded.add(index);
    }
    this.expandedDevices.set(expanded);
  }

  protected isDeviceExpanded(index: number): boolean {
    return this.expandedDevices().has(index);
  }

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
          
          console.log(`Auto-selected Purchase Order: ${targetPurchase.purchase.supplier_order_no}`);
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
        
        // Auto-populate all parts with remaining quantities
        if (purchase) {
          this.autoPopulateParts(purchase);
        }
      } else {
        this.selectedPurchase.set(null);
        this.clearItems();
      }
    });

    // Watch for items form array changes (including selection changes)
    this.itemsFormArray().valueChanges.subscribe(() => {
      this.triggerFormChange();
    });
  }

  private autoPopulateParts(purchase: PurchaseWithItems) {
    // Get all items (both parts and devices) with remaining quantity > 0
    const itemsToReceive = purchase.items.filter(item => 
      item.remaining_quantity > 0
    );

    // Add each item to the form array
    itemsToReceive.forEach(purchaseItem => {
      let quantityControl;
      
      if (purchaseItem.is_part) {
        // For parts: pre-fill with remaining quantity
        quantityControl = this.fb.control(
          purchaseItem.remaining_quantity,
          [
            Validators.required, 
            Validators.min(0), // Allow 0 so users can skip items
            Validators.max(purchaseItem.remaining_quantity),
            ProductReceiveComponent.positiveNumberValidator,
            ProductReceiveComponent.maxRemainingValidator(purchaseItem.remaining_quantity)
          ]
        );
      } else {
        // For devices: start with 0 and disable (calculated from identifiers)
        quantityControl = this.fb.control(
          { value: 0, disabled: true }
        );
      }

      const itemGroup = this.fb.group({
        purchase_item_id: [purchaseItem.id, [Validators.required]],
        sku: [purchaseItem.sku, [Validators.required]],
        quantity_received: quantityControl,
        is_part: [purchaseItem.is_part],
        remaining_quantity: [purchaseItem.remaining_quantity],
        identifiers: this.fb.array([]),
        selected: [true] // Default to selected; users can unselect items if needed
      });

      this.itemsFormArray().push(itemGroup);
    });

    // Trigger change detection after populating
    this.triggerFormChange();
  }

  protected removeItem(index: number) {
    this.itemsFormArray().removeAt(index);
    // Also remove from expanded devices if it was expanded
    const expanded = new Set(this.expandedDevices());
    expanded.delete(index);
    this.expandedDevices.set(expanded);
  }

  protected clearItems() {
    while (this.itemsFormArray().length !== 0) {
      this.itemsFormArray().removeAt(0);
    }
    // Clear expanded devices when clearing items
    this.expandedDevices.set(new Set());
  }

  protected getIdentifiersArray(itemIndex: number): FormArray {
    return this.itemsFormArray().at(itemIndex).get('identifiers') as FormArray;
  }

  protected getItemIndex(itemControl: AbstractControl): number {
    return this.itemsFormArray().controls.indexOf(itemControl);
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
    const remainingQuantity = itemGroup.get('remaining_quantity')?.value || 0;
    const sku = itemGroup.get('sku')?.value || '';
    
    // Check if we've reached the remaining quantity limit
    if (identifiersArray.length >= remainingQuantity) {
      this.error.set(`Cannot scan more than ${remainingQuantity} identifiers for SKU: ${sku}. Remaining quantity limit reached.`);
      return;
    }
    
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
        const remainingQuantity = itemGroup.get('remaining_quantity')?.value;
        
        if (isPartControl?.value && quantityControl?.invalid) {
          // Check specific error types for better messages
          if (quantityControl?.errors?.['exceedsRemaining'] || quantityControl?.errors?.['max']) {
            this.error.set(`Quantity for SKU ${skuValue} exceeds remaining quantity (${remainingQuantity})`);
          } else if (quantityControl?.errors?.['invalidFormat']) {
            this.error.set(`Invalid quantity format for SKU: ${skuValue}`);
          } else {
            this.error.set(`Please enter a valid quantity for SKU: ${skuValue}`);
          }
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

      // Filter out unselected items and items with 0 quantity
      const items: ReceiveItemsRequestItem[] = formValue.items!
        .filter((item: any) => {
          // Only include selected items
          if (!item.selected) return false;
          
          const quantity = item.identifiers?.length > 0 ? item.identifiers.length : (item.quantity_received || 0);
          return quantity > 0;
        })
        .map((item: any) => ({
          purchase_item_id: item.purchase_item_id,
          sku: item.sku,
          quantity_received: item.identifiers?.length > 0 ? item.identifiers.length : (item.quantity_received || 0),
          ...(item.identifiers?.length > 0 && { identifiers: item.identifiers })
        }));

      // Check if there are any items to receive
      if (items.length === 0) {
        this.error.set('Please select at least one item to receive with quantity greater than 0');
        this.submitting.set(false);
        return;
      }

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

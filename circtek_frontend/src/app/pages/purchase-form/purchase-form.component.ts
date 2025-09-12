import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { GenericFormPageComponent, type FormField, type FormAction } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PurchaseItemModalComponent, type PurchaseItem } from './purchase-item-modal/purchase-item-modal.component';


interface PurchaseFormData {
  purchase_order_no: string;
  supplier_name: string;
  supplier_order_no: string;
  expected_delivery_date: string;
  customer_name?: string;
  warehouse_id: number;
  remarks?: string;
  invoice?: string;
  transport_doc?: string;
  receiving_picture?: string;
  order_confirmation_doc?: string;
  tracking_number?: string;
  tracking_url?: string;
  items: PurchaseItem[];
}

@Component({
  selector: 'app-purchase-form',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent, PurchaseItemModalComponent],
  templateUrl: './purchase-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  // State
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  warehouses = signal<Array<{ label: string; value: number }>>([]);
  items = signal<PurchaseItem[]>([]);
  
  // Modal state
  isModalOpen = signal(false);
  editingItem = signal<PurchaseItem | null>(null);

  // Form (without items FormArray)
  form = signal<FormGroup>(this.createForm());
  
  // Computed
  totalItems = computed(() => this.items().length);
  totalValue = computed(() => 
    this.items().reduce((sum, item) => sum + (item.quantity * item.price), 0)
  );

  // Form validation
  isFormValid = computed(() => {
    const formValid = this.form().valid;
    const hasItems = this.items().length > 0;
    return formValid && hasItems;
  });

  // Form configuration
  title = signal('Create Purchase Order');
  subtitle = signal('Add a new purchase order with items');
  submitLabel = signal('Create Purchase');

  fields = computed<FormField[]>(() => [
    {
      key: 'purchase_order_no',
      label: 'Purchase Order Number',
      type: 'text',
      required: true,
      placeholder: 'Enter purchase order number'
    },
    {
      key: 'supplier_name',
      label: 'Supplier Name',
      type: 'text',
      required: true,
      placeholder: 'Enter supplier name'
    },
    {
      key: 'supplier_order_no',
      label: 'Supplier Order Number',
      type: 'text',
      required: true,
      placeholder: 'Enter supplier order number'
    },
    {
      key: 'expected_delivery_date',
      label: 'Expected Delivery Date',
      type: 'date',
      required: true,
      placeholder: 'Select delivery date'
    },
    {
      key: 'customer_name',
      label: 'Customer Name',
      type: 'text',
      placeholder: 'Enter customer name'
    },
    {
      key: 'warehouse_id',
      label: 'Warehouse',
      type: 'select',
      required: true,
      options: this.warehouses()
    },
    {
      key: 'remarks',
      label: 'Remarks',
      type: 'textarea',
      placeholder: 'Additional notes or comments'
    },
    {
      key: 'invoice',
      label: 'Invoice Document',
      type: 'file',
      placeholder: 'Upload invoice document'
    },
    {
      key: 'transport_doc',
      label: 'Transport Document',
      type: 'file',
      placeholder: 'Upload transport document'
    },
    {
      key: 'receiving_picture',
      label: 'Receiving Picture',
      type: 'file',
      placeholder: 'Upload receiving picture'
    },
    {
      key: 'order_confirmation_doc',
      label: 'Order Confirmation Document',
      type: 'file',
      placeholder: 'Upload order confirmation'
    },
    {
      key: 'tracking_number',
      label: 'Tracking Number',
      type: 'text',
      placeholder: 'Tracking number or reference'
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

  // Items management methods
  openAddItemModal(): void {
    this.editingItem.set(null);
    this.isModalOpen.set(true);
  }

  openEditItemModal(item: PurchaseItem): void {
    this.editingItem.set(item);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingItem.set(null);
  }

  saveItem(item: PurchaseItem): void {
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

  ngOnInit(): void {
    this.loadWarehouses();
  }

  private loadWarehouses(): void {
    this.loading.set(true);
    this.api.getWarehouses().subscribe({
      next: (response: any) => {
        this.loading.set(false);
        if (response.data) {
          const warehouseOptions = response.data.map((warehouse: any) => ({
            label: warehouse.name,
            value: warehouse.id
          }));
          this.warehouses.set(warehouseOptions);
        }
      },
      error: (error: any) => {
        this.loading.set(false);
        this.error.set('Failed to load warehouses');
        console.error('Error loading warehouses:', error);
      }
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      purchase_order_no: ['', [Validators.required]],
      supplier_name: ['', [Validators.required]],
      supplier_order_no: ['', [Validators.required]],
      expected_delivery_date: ['', [Validators.required, this.dateValidator]],
      customer_name: [''],
      warehouse_id: ['', [Validators.required]],
      remarks: [''],
      invoice: [''],
      transport_doc: [''],
      receiving_picture: [''],
      order_confirmation_doc: [''],
      tracking_number: [''],
      tracking_url: ['']
    });
  }

  private dateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }

    const selectedDate = new Date(control.value);
    const today = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(today.getFullYear() + 1);
    
    // Reset time to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    oneYearFromNow.setHours(0, 0, 0, 0);

    // Check if date is in the past (before today)
    if (selectedDate < today) {
      return { dateInPast: { message: 'Expected delivery date cannot be in the past' } };
    }

    // Check if date is too far in the future (more than 1 year)
    if (selectedDate > oneYearFromNow) {
      return { dateTooFar: { message: 'Expected delivery date cannot be more than 1 year in the future' } };
    }

    return null;
  }


  onSubmit(): void {
    if (this.form().invalid || this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);

    const formValue = this.form().value as PurchaseFormData;
    
    // Prepare payload for API
    const payload = {
      purchase: {
        purchase_order_no: formValue.purchase_order_no,
        supplier_name: formValue.supplier_name,
        supplier_order_no: formValue.supplier_order_no,
        expected_delivery_date: formValue.expected_delivery_date,
        customer_name: formValue.customer_name || undefined,
        warehouse_id: formValue.warehouse_id,
        remarks: formValue.remarks || undefined,
        invoice: formValue.invoice || undefined,
        transport_doc: formValue.transport_doc || undefined,
        receiving_picture: formValue.receiving_picture || undefined,
        order_confirmation_doc: formValue.order_confirmation_doc || undefined,
        tracking_number: formValue.tracking_number || undefined,
        tracking_url: formValue.tracking_url || undefined
      },
      items: this.items().map(item => ({
        sku: item.sku,
        quantity: item.quantity,
        price: item.price,
        is_part: item.is_part
      }))
    };

    this.api.createPurchaseWithItems(payload).subscribe({
      next: (response) => {
        this.submitting.set(false);
        if (response.data) {
          this.toast.saveSuccess('Purchase Order', 'created');
          this.router.navigate(['/stock-management'], { 
            queryParams: { tab: 'purchases' }
          });
        } else {
          this.error.set('Failed to create purchase order');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.message || 'An error occurred while creating the purchase order');
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
      queryParams: { tab: 'purchases' }
    });
  }
}

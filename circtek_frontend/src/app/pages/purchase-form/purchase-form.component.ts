import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
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
      placeholder: 'Enter purchase order number',
      validation: {
        maxlength: 50
      }
    },
    {
      key: 'supplier_name',
      label: 'Supplier Name',
      type: 'text',
      required: true,
      placeholder: 'Enter supplier name',
      validation: {
        maxlength: 100
      }
    },
    {
      key: 'supplier_order_no',
      label: 'Supplier Order Number',
      type: 'text',
      required: true,
      placeholder: 'Enter supplier order number',
      validation: {
        maxlength: 50
      }
    },
    {
      key: 'expected_delivery_date',
      label: 'Expected Delivery Date',
      type: 'date',
      required: true,
      placeholder: 'Select delivery date',
      validation: {
        min: new Date().toISOString().split('T')[0], // Today's date
        max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // One year from now
      }
    },
    {
      key: 'customer_name',
      label: 'Customer Name',
      type: 'text',
      placeholder: 'Enter customer name',
      validation: {
        maxlength: 100
      }
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
      placeholder: 'Additional notes or comments',
      validation: {
        maxlength: 500
      }
    },
    {
      key: 'invoice',
      label: 'Invoice Document',
      type: 'file',
      placeholder: 'Upload invoice document (PDF only)',
      validation: {
        pattern: '.pdf'
      }
    },
    {
      key: 'transport_doc',
      label: 'Transport Document',
      type: 'file',
      placeholder: 'Upload transport document (PDF only)',
      validation: {
        pattern: '.pdf'
      }
    },
    {
      key: 'receiving_picture',
      label: 'Receiving Picture',
      type: 'file',
      placeholder: 'Upload receiving picture (Images only)',
      validation: {
        pattern: '.jpg,.jpeg,.png,.gif'
      }
    },
    {
      key: 'order_confirmation_doc',
      label: 'Order Confirmation Document',
      type: 'file',
      placeholder: 'Upload order confirmation (PDF only)',
      validation: {
        pattern: '.pdf'
      }
    },
    {
      key: 'tracking_number',
      label: 'Tracking Number',
      type: 'text',
      placeholder: 'Tracking number or reference',
      validation: {
        maxlength: 100
      }
    },
    {
      key: 'tracking_url',
      label: 'Tracking URL',
      type: 'text',
      placeholder: 'https://tracking.example.com/...',
      validation: {
        maxlength: 255
      }
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

  // Static validators
  private static whitespaceValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }
    
    if (typeof control.value === 'string' && control.value.trim().length === 0) {
      return { whitespace: { message: 'Cannot be empty or spaces only' } };
    }
    
    return null;
  };
  
  private static maxLengthWithTrim(maxLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Let required validator handle empty values
      }
      
      const trimmedValue = typeof control.value === 'string' ? control.value.trim() : String(control.value);
      if (trimmedValue.length > maxLength) {
        return { 
          maxlength: { 
            message: `Cannot exceed ${maxLength} characters`, 
            actualLength: trimmedValue.length,
            requiredLength: maxLength 
          } 
        };
      }
      
      return null;
    };
  }

  private static dateValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }

    // Parse the date value
    const selectedDate = new Date(control.value);
    
    // Check if the date is valid
    if (isNaN(selectedDate.getTime())) {
      return { invalidDate: { message: 'Please enter a valid date' } };
    }

    // Additional check for reasonable date range (prevent extreme dates)
    const currentYear = new Date().getFullYear();
    const selectedYear = selectedDate.getFullYear();
    
    // Check if year is reasonable (between 1900 and 2100)
    if (selectedYear < 1900 || selectedYear > 2100) {
      return { invalidDate: { message: 'Please enter a valid date' } };
    }

    const today = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(today.getFullYear() + 1);
    
    // Reset time to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    oneYearFromNow.setHours(0, 0, 0, 0);

    // Check if date is in the past (before today)
    if (selectedDate < today) {
      return { dateInPast: { message: 'Date cannot be in the past' } };
    }

    // Check if date is too far in the future (more than 1 year)
    if (selectedDate > oneYearFromNow) {
      return { dateTooFar: { message: 'Date cannot be more than 1 year ahead' } };
    }

    return null;
  };

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
      purchase_order_no: ['', [
        Validators.required, 
        PurchaseFormComponent.whitespaceValidator,
        PurchaseFormComponent.maxLengthWithTrim(50)
      ]],
      supplier_name: ['', [
        Validators.required, 
        PurchaseFormComponent.whitespaceValidator,
        PurchaseFormComponent.maxLengthWithTrim(100)
      ]],
      supplier_order_no: ['', [
        Validators.required, 
        PurchaseFormComponent.whitespaceValidator,
        PurchaseFormComponent.maxLengthWithTrim(50)
      ]],
      expected_delivery_date: ['', [Validators.required, PurchaseFormComponent.dateValidator]],
      customer_name: ['', [
        PurchaseFormComponent.whitespaceValidator,
        PurchaseFormComponent.maxLengthWithTrim(100)
      ]],
      warehouse_id: ['', [Validators.required]],
      remarks: ['', [
        PurchaseFormComponent.whitespaceValidator,
        PurchaseFormComponent.maxLengthWithTrim(500)
      ]],
      invoice: [''],
      transport_doc: [''],
      receiving_picture: [''],
      order_confirmation_doc: [''],
      tracking_number: ['', [
        PurchaseFormComponent.whitespaceValidator,
        PurchaseFormComponent.maxLengthWithTrim(100)
      ]],
      tracking_url: ['', [
        PurchaseFormComponent.whitespaceValidator,
        Validators.maxLength(255)
      ]]
    });
  }



  onSubmit(): void {
    // Mark all form fields as touched to show validation errors
    this.markAllFieldsAsTouched();
    
    // Check form validity and items
    if (this.form().invalid || this.items().length === 0 || this.submitting()) {
      if (this.items().length === 0) {
        this.error.set('Please add at least one item');
      }
      return;
    }

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
        
        // Only consider success if we have a 2xx status and actual data
        if (response.status >= 200 && response.status < 300 && response.data) {
          this.toast.saveSuccess('Purchase Order', 'created');
          
          // Clear the form to prevent resubmission
          this.form().reset();
          this.items.set([]);
          
          // Navigate to the purchases list
          this.router.navigate(['/stock-management'], { 
            queryParams: { tab: 'purchases' }
          });
        } else {
          // Handle server-side validation or creation errors
          const errorMessage = response.message || 'Failed to create purchase order';
          this.error.set(errorMessage);
          
          // Log for debugging
          console.error('Purchase creation failed:', response);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        
        // Handle HTTP errors and network issues
        let errorMessage = 'An error occurred while creating the purchase order';
        
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.status === 0) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.status >= 400 && err.status < 500) {
          errorMessage = 'Invalid data provided. Please check your inputs and try again.';
        } else if (err.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        this.error.set(errorMessage);
        
        // Log for debugging
        console.error('Purchase creation error:', err);
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

  private markAllFieldsAsTouched(): void {
    Object.keys(this.form().controls).forEach(key => {
      this.form().get(key)?.markAsTouched();
    });
  }
}

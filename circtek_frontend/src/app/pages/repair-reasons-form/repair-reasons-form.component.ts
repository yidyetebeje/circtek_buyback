import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Observable, catchError, throwError, forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GenericFormPageComponent, type FormField, type FormAction } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { RepairReasonRecord, RepairReasonCreateInput, RepairReasonUpdateInput, RepairReasonModelPriceRecord, RepairReasonModelPriceCreateInput } from '../../core/models/repair-reason';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, Plus, Trash2 } from 'lucide-angular';
import { IPHONE_MODELS } from '../../core/constants/iphone-models';

@Component({
  selector: 'app-repair-reasons-form',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent, LucideAngularModule],
  template: `
    <app-generic-form-page
      [title]="title()"
      [subtitle]="subtitle()"
      [form]="form"
      [fields]="fields()"
      [actions]="actions()"
      [loading]="loading()"
      [submitting]="submitting()"
      [error]="error()"
      [submitLabel]="submitLabel()"
      (formSubmit)="onSubmit()"
      (actionClick)="onActionClick($event)"
      (backClick)="onBackClick()"
    >
      <!-- Model-Specific Pricing Section -->
      <div class="mt-8 pt-6 border-t border-base-300">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold">Model-Specific Pricing</h3>
            <p class="text-sm text-base-content/60 mt-1">
              Set custom prices for specific device models. If not specified, the default fixed price will be used.
            </p>
          </div>
          <button 
            type="button" 
            class="btn btn-sm btn-outline btn-accent"
            (click)="addModelPrice()"
            [disabled]="submitting()"
          >
            <lucide-icon [img]="PlusIcon" class="size-4"></lucide-icon>
            Add Model Price
          </button>
        </div>

        @if (visibleModelPrices.length === 0) {
          <div class="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>No model-specific prices added. The default fixed price will apply to all models.</span>
          </div>
        } @else {
          <div class="space-y-3">
            @for (item of getVisibleModelPricesWithIndex(); track item.index) {
              <div [formGroup]="item.control" class="flex gap-3 items-start p-4 bg-base-200 rounded-lg">
                <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <!-- Model Name Input with Autocomplete -->
                  <div class="form-control w-full">
                    <label class="label">
                      <span class="label-text font-medium">Model Name</span>
                    </label>
                    <input 
                      type="text" 
                      formControlName="model_name"
                      [attr.list]="'iphone-models-' + item.index"
                      placeholder="Select or type iPhone model..."
                      class="input input-bordered w-full"
                      [class.input-error]="item.control.get('model_name')?.invalid && item.control.get('model_name')?.touched"
                      autocomplete="off"
                    />
                    <datalist [id]="'iphone-models-' + item.index">
                      @for (model of iphoneModels; track model) {
                        <option [value]="model">{{ model }}</option>
                      }
                    </datalist>
                    @if (item.control.get('model_name')?.invalid && item.control.get('model_name')?.touched) {
                      <label class="label">
                        <span class="label-text-alt text-error">Model name is required</span>
                      </label>
                    }
                    <label class="label">
                      <span class="label-text-alt text-base-content/60">
                        Select from iPhone 11 to iPhone 17 lineup
                      </span>
                    </label>
                  </div>

                  <!-- Fixed Price Input -->
                  <div class="form-control w-full">
                    <label class="label">
                      <span class="label-text font-medium">Fixed Price</span>
                    </label>
                    <input 
                      type="number" 
                      formControlName="fixed_price"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      class="input input-bordered w-full"
                      [class.input-error]="item.control.get('fixed_price')?.invalid && item.control.get('fixed_price')?.touched"
                    />
                    @if (item.control.get('fixed_price')?.invalid && item.control.get('fixed_price')?.touched) {
                      <label class="label">
                        <span class="label-text-alt text-error">Price must be 0 or greater</span>
                      </label>
                    }
                  </div>
                </div>

                <!-- Delete Button -->
                <button 
                  type="button" 
                  class="btn btn-sm btn-ghost btn-error mt-9"
                  (click)="removeModelPrice(item.index)"
                  [disabled]="submitting()"
                >
                  <lucide-icon [img]="Trash2Icon" class="size-4"></lucide-icon>
                </button>
              </div>
            }
          </div>
        }
      </div>
    </app-generic-form-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepairReasonsFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly toastr = inject(ToastrService);

  // Icons
  protected readonly PlusIcon = Plus;
  protected readonly Trash2Icon = Trash2;

  // iPhone Models List
  protected readonly iphoneModels = IPHONE_MODELS;
  protected filteredModels = signal<readonly string[]>(IPHONE_MODELS);

  // Custom validators
  private lettersOnlyValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const value = control.value.toString();
    const trimmedValue = value.trim();
    if (!trimmedValue) return null; // Allow empty values (for optional fields)
    
    // Allow letters (including accented characters), spaces, apostrophes, and hyphens
    const lettersOnlyPattern = /^[a-zA-ZÀ-ÿ\s'-]+$/;
    
    if (!lettersOnlyPattern.test(value)) {
      return { lettersOnly: { message: 'Only letters, spaces, apostrophes, and hyphens are allowed' } };
    }
    
    // Check for more than two consecutive spaces
    if (/\s{3,}/.test(value)) {
      return { excessiveWhitespace: { message: 'No more than two consecutive spaces allowed' } };
    }
    
    return null;
  }

  // Validator specifically for required fields that must contain only letters
  private requiredLettersOnlyValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const value = control.value.toString();
    const trimmedValue = value.trim();
    if (!trimmedValue) return { required: true };
    
    // Allow letters (including accented characters), spaces, apostrophes, and hyphens
    const lettersOnlyPattern = /^[a-zA-ZÀ-ÿ\s'-]+$/;
    
    if (!lettersOnlyPattern.test(value)) {
      return { lettersOnly: { message: 'Only letters, spaces, apostrophes, and hyphens are allowed' } };
    }
    
    // Check for more than two consecutive spaces
    if (/\s{3,}/.test(value)) {
      return { excessiveWhitespace: { message: 'No more than two consecutive spaces allowed' } };
    }
    
    return null;
  }

  private trimWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const value = control.value.toString();
    const trimmedValue = value.trim();
    
    // Only update on blur or when user stops typing to avoid interfering with typing
    // This will be handled by the form submission instead
    
    return null;
  }

  // Form state
  form: FormGroup;
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);

  // Mode detection
  isEditMode = computed(() => !!this.route.snapshot.params['id']);
  repairReasonId = computed(() => this.route.snapshot.params['id'] ? parseInt(this.route.snapshot.params['id']) : null);

  // UI labels
  title = computed(() => this.isEditMode() ? 'Edit Repair Reason' : 'Create Repair Reason');
  subtitle = computed(() => this.isEditMode() ? 'Update repair reason details' : 'Add a new repair reason to the system');
  submitLabel = computed(() => this.isEditMode() ? 'Update Repair Reason' : 'Create Repair Reason');

  // Form configuration
  fields = computed<FormField[]>(() => [
    {
      key: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      placeholder: 'Enter repair reason name (letters and spaces)',
      description: 'A descriptive name for the repair reason (2-100 characters, letters and spaces allowed)'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      placeholder: 'Enter detailed description (optional, letters and spaces)',
      description: 'Additional details about this repair reason (max 500 characters, letters and spaces allowed)'
    },
    {
      key: 'fixed_price',
      label: 'Fixed Price',
      type: 'number',
      required: false,
      placeholder: 'Enter fixed price (fill if no parts are needed and the repair is service-only)',
      description: "Fill this only if the repair doesn't require any part (service-only)."
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active', value: true },
        { label: 'Inactive', value: false }
      ],
      description: 'Whether this repair reason is currently active'
    }
  ]);

  actions = computed<FormAction[]>(() => [
    {
      label: 'Cancel',
      type: 'button',
      variant: 'ghost'
    }
  ]);

  constructor() {
    this.form = this.fb.group({
      name: ['', [
        Validators.required, 
        Validators.minLength(2), 
        Validators.maxLength(100), // Limit name to 100 characters
        this.requiredLettersOnlyValidator.bind(this),
        this.trimWhitespaceValidator.bind(this)
      ]],
      description: ['', [
        Validators.maxLength(500), // Limit description to 500 characters
        this.lettersOnlyValidator.bind(this), // Allow empty for optional field
        this.trimWhitespaceValidator.bind(this)
      ]],
      fixed_price: [null, [Validators.min(0)]], // Optional fixed price, must be >= 0 if provided
      status: [true, [Validators.required]],
      model_prices: this.fb.array([]) // FormArray for model-specific prices
    });

    // Load data if editing
    if (this.isEditMode()) {
      this.loadRepairReason();
    }
  }

  // Getter for model_prices FormArray
  get modelPrices(): FormArray {
    return this.form.get('model_prices') as FormArray;
  }

  // Create a new model price FormGroup
  private createModelPriceFormGroup(modelPrice?: RepairReasonModelPriceRecord): FormGroup {
    return this.fb.group({
      id: [modelPrice?.id || null],
      model_name: [modelPrice?.model_name || '', [Validators.required, Validators.minLength(1), Validators.maxLength(255)]],
      fixed_price: [modelPrice?.fixed_price || null, [Validators.required, Validators.min(0)]],
      status: [modelPrice?.status ?? true],
      _isNew: [!modelPrice], // Track if this is a new price or existing
      _isDeleted: [false] // Track if this should be deleted
    });
  }

  // Add a new model price row
  addModelPrice(): void {
    this.modelPrices.push(this.createModelPriceFormGroup());
  }

  // Remove a model price row
  removeModelPrice(index: number): void {
    const control = this.modelPrices.at(index);
    const id = control.get('id')?.value;
    
    if (id) {
      // Mark existing price for deletion
      control.get('_isDeleted')?.setValue(true);
      control.disable();
    } else {
      // Remove new price immediately
      this.modelPrices.removeAt(index);
    }
  }

  // Get visible model prices (not marked for deletion)
  get visibleModelPrices(): FormGroup[] {
    return this.modelPrices.controls
      .map((control, index) => ({ control: control as FormGroup, index }))
      .filter(({ control }) => !control.get('_isDeleted')?.value)
      .map(({ control }) => control);
  }

  // Get visible model prices with their original indices
  getVisibleModelPricesWithIndex(): Array<{ control: FormGroup; index: number }> {
    return this.modelPrices.controls
      .map((control, index) => ({ control: control as FormGroup, index }))
      .filter(({ control }) => !control.get('_isDeleted')?.value);
  }

  private loadRepairReason(): void {
    const id = this.repairReasonId();
    if (!id) return;

    this.loading.set(true);
    this.error.set(null);

    // Load repair reason with model prices
    this.api.getRepairReasonWithModelPrices(id).subscribe({
      next: (response) => {
        if (response.data) {
          this.form.patchValue({
            name: response.data.name,
            description: response.data.description || '',
            fixed_price: response.data.fixed_price ? Number(response.data.fixed_price) : null,
            status: response.data.status
          });

          // Load model prices
          this.modelPrices.clear();
          if (response.data.model_prices && response.data.model_prices.length > 0) {
            response.data.model_prices.forEach(price => {
              this.modelPrices.push(this.createModelPriceFormGroup(price));
            });
          }
        } else {
          this.error.set('Repair reason not found');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load repair reason details');
        this.loading.set(false);
        console.error('Error loading repair reason:', err);
      }
    });
  }

  onSubmit(): void {
    // Mark all main form fields as touched
    Object.keys(this.form.controls).forEach(key => {
      if (key !== 'model_prices') {
        this.form.get(key)?.markAsTouched();
      }
    });

    // Mark all model price controls as touched (but skip deleted ones)
    this.modelPrices.controls.forEach(control => {
      const formGroup = control as FormGroup;
      if (!formGroup.get('_isDeleted')?.value) {
        Object.keys(formGroup.controls).forEach(key => {
          if (!key.startsWith('_')) {
            formGroup.get(key)?.markAsTouched();
          }
        });
      }
    });

    // Check if main form is valid (excluding model_prices)
    const mainFormValid = this.form.get('name')?.valid && 
                          this.form.get('description')?.valid && 
                          this.form.get('fixed_price')?.valid && 
                          this.form.get('status')?.valid;

    // Check if visible model prices are valid
    const modelPricesValid = this.getVisibleModelPricesWithIndex().every(item => {
      const modelNameValid = item.control.get('model_name')?.valid;
      const fixedPriceValid = item.control.get('fixed_price')?.valid;
      return modelNameValid && fixedPriceValid;
    });

    if (!mainFormValid || !modelPricesValid) {
      console.error('Form validation failed:', {
        mainFormValid,
        modelPricesValid,
        formErrors: this.form.errors,
        modelPricesErrors: this.modelPrices.controls.map(c => (c as FormGroup).errors)
      });
      this.error.set('Please fix validation errors before submitting');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    console.log('Submitting form with model prices count:', this.modelPrices.length);

    // Ensure values are properly trimmed before submission
    const formData: any = {
      name: this.form.value.name?.toString().trim() || '',
      description: this.form.value.description?.toString().trim() || '',
      status: this.form.value.status
    };

    // Only include fixed_price if it has a value
    if (this.form.value.fixed_price !== null && this.form.value.fixed_price !== undefined && this.form.value.fixed_price !== '') {
      formData.fixed_price = Number(this.form.value.fixed_price);
    }

    console.log('Form data to submit:', formData);

    const request = this.isEditMode() 
      ? this.updateRepairReason(formData)
      : this.createRepairReason(formData);

    request.pipe(
      switchMap((response) => {
        if (!response.data) {
          throw new Error(response.message || 'Operation failed');
        }

        const repairReasonId = response.data.id;
        console.log('Repair reason saved with ID:', repairReasonId);
        console.log('Will save model prices, count:', this.modelPrices.length);

        // Save model prices for both create and edit modes
        if (this.modelPrices.length > 0) {
          return this.saveModelPrices(repairReasonId).pipe(
            switchMap(() => of(response))
          );
        }
        return of(response);
      })
    ).subscribe({
      next: (response) => {
        console.log('Form submitted successfully');
        this.toast.saveSuccess('Repair Reason', this.isEditMode() ? 'updated' : 'created');
        this.router.navigate(['/repair'], { 
          queryParams: { tab: 'repair-reasons' } 
        });
        this.submitting.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Operation failed. Please try again.');
        this.submitting.set(false);
        console.error('Error submitting repair reason:', err);
        this.toast.saveError('Repair Reason', this.isEditMode() ? 'update' : 'create');
      }
    });
  }

  private saveModelPrices(repairReasonId: number): Observable<any> {
    const requests: Observable<any>[] = [];

    console.log('=== saveModelPrices called ===');
    console.log('Repair Reason ID:', repairReasonId);
    console.log('Total model prices controls:', this.modelPrices.controls.length);

    this.modelPrices.controls.forEach((control, index) => {
      const formGroup = control as FormGroup;
      const id = formGroup.get('id')?.value;
      const isNew = formGroup.get('_isNew')?.value;
      const isDeleted = formGroup.get('_isDeleted')?.value;
      const modelName = formGroup.get('model_name')?.value?.trim();
      const fixedPrice = formGroup.get('fixed_price')?.value;

      console.log(`Control ${index}:`, {
        id,
        isNew,
        isDeleted,
        modelName,
        fixedPrice,
        disabled: formGroup.disabled
      });

      if (isDeleted && id) {
        // Delete existing price
        console.log(`→ Deleting model price ID: ${id}`);
        requests.push(this.api.deleteModelPrice(id));
      } else if (isNew && !isDeleted) {
        // Create new price
        const data: RepairReasonModelPriceCreateInput = {
          model_name: modelName,
          fixed_price: Number(fixedPrice),
          status: formGroup.get('status')?.value ?? true
        };
        console.log('→ Creating new model price:', data);
        requests.push(this.api.createModelPrice(repairReasonId, data));
      } else if (!isNew && !isDeleted && id) {
        // Update existing price
        const data = {
          model_name: modelName,
          fixed_price: Number(fixedPrice),
          status: formGroup.get('status')?.value
        };
        console.log(`→ Updating model price ID ${id}:`, data);
        requests.push(this.api.updateModelPrice(id, data));
      } else {
        console.log('→ Skipped (no action needed)');
      }
    });

    console.log('Total API requests to execute:', requests.length);

    // If no requests, return empty observable
    if (requests.length === 0) {
      console.log('No model price operations needed');
      return of(null);
    }

    // Execute all requests in parallel
    console.log('Executing model price API calls...');
    return forkJoin(requests).pipe(
      switchMap((results) => {
        console.log('Model price operations completed:', results);
        return of(results);
      }),
      catchError((error) => {
        console.error('Error saving model prices:', error);
        throw error;
      })
    );
  }

  private createRepairReason(data: RepairReasonCreateInput) {
    return this.api.createRepairReason(data);
  }

  private updateRepairReason(data: RepairReasonUpdateInput) {
    const id = this.repairReasonId();
    if (!id) throw new Error('No repair reason ID for update');
    return this.api.updateRepairReason(id, data);
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
    this.router.navigate(['/repair'], { 
      queryParams: { tab: 'repair-reasons' } 
    });
  }
}

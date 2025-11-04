import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, Plus, X, ArrowLeft } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

import { GenericFormPageComponent, type FormField, type FormAction } from '../../../shared/components/generic-form-page/generic-form-page.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { SkuMapping, SkuPropertyKey, CreateSkuMappingRequest, UpdateSkuMappingRequest } from '../../../core/models/sku-mapping';
import { SKU_PROPERTY_OPTIONS, SKU_PROPERTY_LABELS, SKU_PROPERTY_KEYS } from '../../../core/constants/sku-property-options';
import { Grade } from '../../../core/models/grade';
import { ApiService } from '../../../core/services/api.service';

// Custom validator to ensure at least one condition exists
function minConditionsValidator(control: AbstractControl): ValidationErrors | null {
  const formArray = control as FormArray;
  return formArray.length === 0 ? { noConditions: true } : null;
}

@Component({
  selector: 'app-sku-mapping-form',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent, LucideAngularModule, SearchableSelectComponent],
  templateUrl: './sku-mapping-form.component.html',
  styleUrl: './sku-mapping-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkuMappingFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  // Icons
  readonly Plus = Plus;
  readonly X = X;
  readonly ArrowLeft = ArrowLeft;

  // Constants
  readonly SKU_PROPERTY_LABELS = SKU_PROPERTY_LABELS;
  readonly SKU_PROPERTY_OPTIONS = SKU_PROPERTY_OPTIONS;
  readonly SKU_PROPERTY_KEYS = SKU_PROPERTY_KEYS;

  // State
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);
  mappingId = signal<string | null>(null);
  mapping = signal<SkuMapping | null>(null);
  grades = signal<Grade[]>([]);
  errorMessage = signal<string | null>(null);

  // Computed properties
  isEditMode = computed(() => !!this.mappingId());
  title = computed(() => this.isEditMode() ? 'Edit SKU Mapping' : 'Add New SKU Mapping');
  subtitle = computed(() => this.isEditMode() ? 'Update an existing SKU mapping rule' : 'Create a new SKU mapping rule based on device properties');
  
  // Form field configuration for basic SKU field
  fields = computed<FormField[]>(() => [
    {
      key: 'sku',
      label: 'Resulting SKU',
      type: 'text',
      placeholder: 'e.g., APPLE-128-A',
      required: true,
      helpText: 'This is the SKU that will be assigned to devices matching the conditions below'
    }
  ]);
  
  // Form actions
  actions = computed<FormAction[]>(() => [
    {
      label: 'Cancel',
      type: 'button',
      variant: 'ghost'
    },
    {
      label: this.isEditMode() ? 'Update Mapping' : 'Create Mapping',
      type: 'submit',
      variant: 'primary',
      disabled: !this.formValid() || this.submitting()
    }
  ]);

  // Form
  form = this.fb.group({
    sku: ['', [Validators.required, Validators.minLength(1)]],
    conditions: this.fb.array([], [minConditionsValidator])
  });
  
  // Single condition form for adding new conditions
  newConditionForm = this.fb.group({
    propertyKey: ['', Validators.required],
    propertyValue: ['', Validators.required],
    operator: ['>'] // Default operator for number properties
  });
  
  // Signals for form state
  newConditionPropertyKey = signal<string>('');
  newConditionPropertyValue = signal<string>('');
  newConditionOperator = signal<string>('>');
  newConditionFormValid = signal<boolean>(false);
  formValid = signal<boolean>(false);

  // Computed form properties
  conditionsArray = computed(() => this.form.get('conditions') as FormArray);
  usedPropertyKeys = computed(() => {
    return this.conditionsArray().controls
      .map(group => (group as FormGroup).get('propertyKey')?.value)
      .filter(key => key && key.trim());
  });

  // All property keys are always available (we allow replacing existing ones)
  availablePropertyKeys = computed(() => {
    return SKU_PROPERTY_KEYS;
  });
  
  // Check if we can add the current condition
  canAddCurrentCondition = computed(() => {
    const key = this.newConditionPropertyKey();
    const value = this.newConditionPropertyValue();
    const isValid = this.newConditionFormValid();
    return key && value && isValid;
  });


  constructor() {
    // Initialize form based on route parameters
    effect(() => {
      const id = this.route.snapshot.params['id'];
      if (id) {
        this.mappingId.set(id);
        this.loadMapping(id);
      } else {
        this.mappingId.set(null);
        this.initializeForm(null);
      }
    }, { allowSignalWrites: true });

    // Load grades
    effect(() => {
      this.loadGrades();
    }, { allowSignalWrites: true });

    // Setup form change subscriptions
    effect(() => {
      // Subscribe to property key changes
      this.newConditionForm.get('propertyKey')?.valueChanges.subscribe(value => {
        this.newConditionPropertyKey.set(value || '');
        // Reset property value when property key changes
        this.newConditionForm.get('propertyValue')?.setValue('');
        this.newConditionPropertyValue.set('');
        // Reset operator to default
        this.newConditionForm.get('operator')?.setValue('>');
        this.newConditionOperator.set('>');
      });
      
      // Subscribe to property value changes  
      this.newConditionForm.get('propertyValue')?.valueChanges.subscribe(value => {
        this.newConditionPropertyValue.set(value || '');
      });
      
      // Subscribe to operator changes
      this.newConditionForm.get('operator')?.valueChanges.subscribe(value => {
        this.newConditionOperator.set(value || '>');
      });
      
      // Subscribe to form validity changes
      this.newConditionForm.statusChanges.subscribe(status => {
        this.newConditionFormValid.set(status === 'VALID');
      });
      
      // Subscribe to main form validity changes
      this.form.statusChanges.subscribe(status => {
        this.formValid.set(status === 'VALID');
      });
      
      // Set initial validity
      this.formValid.set(this.form.valid);
    });
  }

  private async loadMapping(id: string) {
    this.loading.set(true);
    this.errorMessage.set(null);
    
    try {
      const response = await this.api.getSkuMapping(id).toPromise();
      if (response?.data) {
        this.mapping.set(response.data);
        this.initializeForm(response.data);
      } else {
        throw new Error('Mapping not found');
      }
    } catch (error: any) {
      console.error('Failed to load SKU mapping:', error);
      this.errorMessage.set('Failed to load SKU mapping');
      this.toastr.error('Failed to load SKU mapping');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadGrades() {
    try {
      const response = await this.api.getGrades().toPromise();
      if (response?.data) {
        this.grades.set(response.data);
      }
    } catch (error) {
      console.error('Failed to load grades:', error);
      // Fallback to empty array, grades are not critical for basic functionality
      this.grades.set([]);
    }
  }

  private initializeForm(mapping: SkuMapping | null) {
    // Clear existing conditions
    while (this.conditionsArray().length > 0) {
      this.conditionsArray().removeAt(0);
    }

    if (mapping) {
      // Edit mode - populate form with mapping data
      this.form.patchValue({
        sku: mapping.sku
      });

      // Add conditions
      Object.entries(mapping.conditions).forEach(([key, value]) => {
        if (value != null) {
          this.addCondition(key as SkuPropertyKey, value);
        }
      });
    } else {
      // Create mode - reset form
      this.form.patchValue({
        sku: ''
      });
    }
  }
  
  // Reset form to initial state for creating a new mapping
  private resetForm() {
    // Clear the form
    this.form.reset();
    
    // Clear all conditions
    while (this.conditionsArray().length > 0) {
      this.conditionsArray().removeAt(0);
    }
    
    // Reset the new condition form
    this.newConditionForm.reset();
    this.newConditionPropertyKey.set('');
    this.newConditionPropertyValue.set('');
    this.newConditionOperator.set('>');
    this.newConditionFormValid.set(false);
    
    // Clear any error messages
    this.errorMessage.set(null);
    
    // Update form validity
    this.form.updateValueAndValidity();
    this.formValid.set(this.form.valid);
  }

  addCondition(propertyKey?: SkuPropertyKey, propertyValue?: string) {
    // Check if this property already exists
    const existingIndex = this.conditionsArray().controls.findIndex(
      group => (group as FormGroup).get('propertyKey')?.value === propertyKey
    );
    
    // If property exists, remove the old one
    if (existingIndex !== -1) {
      this.conditionsArray().removeAt(existingIndex);
    }
    
    // Add the new condition
    const conditionGroup = this.fb.group({
      propertyKey: [propertyKey || '', Validators.required],
      propertyValue: [propertyValue || '', Validators.required]
    });

    this.conditionsArray().push(conditionGroup);
    
    // Manually trigger form validation after adding condition
    this.form.updateValueAndValidity();
    // Update the validity signal
    this.formValid.set(this.form.valid);
  }
  
  // Add current condition from the new condition form
  addCurrentCondition() {
    if (this.canAddCurrentCondition()) {
      const key = this.newConditionPropertyKey();
      let value = this.newConditionPropertyValue();
      
      // For number properties, prepend the operator to the value
      if (this.isNumberProperty(key)) {
        const operator = this.newConditionOperator();
        value = `${operator}${value}`;
      }
      
      this.addCondition(key as SkuPropertyKey, value);
      // Reset the form and signals
      this.newConditionForm.reset();
      this.newConditionPropertyKey.set('');
      this.newConditionPropertyValue.set('');
      this.newConditionOperator.set('>');
      this.newConditionFormValid.set(false);
    }
  }

  removeCondition(index: number) {
    this.conditionsArray().removeAt(index);
    
    // Manually trigger form validation after removing condition
    this.form.updateValueAndValidity();
    // Update the validity signal
    this.formValid.set(this.form.valid);
  }

  // Get value options for a property key
  getValueOptions(propertyKey: SkuPropertyKey): string[] {
    if (propertyKey === 'grade') {
      return this.grades().map(grade => grade.name);
    }
    // Number properties don't have predefined options
    if (this.isNumberProperty(propertyKey)) {
      return [];
    }
    return SKU_PROPERTY_OPTIONS[propertyKey as Exclude<SkuPropertyKey, 'grade' | 'battery_cycle_count' | 'battery_health'>] || [];
  }
  
  // Get value options for the new condition form
  getNewConditionValueOptions(): string[] {
    const key = this.newConditionForm.get('propertyKey')?.value;
    if (!key) return [];
    return this.getValueOptions(key as SkuPropertyKey);
  }
  
  // Check if property uses number input instead of select
  isNumberProperty(propertyKey: SkuPropertyKey | string | null | undefined): boolean {
    if (!propertyKey) return false;
    return propertyKey === 'battery_cycle_count' || propertyKey === 'battery_health';
  }
  
  // Check if the new condition property is a number property
  isNewConditionNumberProperty = computed(() => {
    const key = this.newConditionPropertyKey();
    return this.isNumberProperty(key);
  });

  onBackClick() {
    this.router.navigate(['/stock-management'], { fragment: 'sku-mappings' });
  }
  
  onActionClick(event: { action: string; data?: any }) {
    switch (event.action) {
      case 'Cancel':
        this.onBackClick();
        break;
      case 'Create Mapping':
      case 'Update Mapping':
        this.onSubmit();
        break;
    }
  }
  
  onFormSubmit(formData: any) {
    this.onSubmit();
  }

  onCancel() {
    this.router.navigate(['/stock-management'], { fragment: 'sku-mappings' });
  }

  async onSubmit() {
    if (this.form.valid && !this.submitting()) {
      this.submitting.set(true);
      this.errorMessage.set(null);

      const formValue = this.form.value;
      
      // Build conditions object
      const conditions: Partial<Record<SkuPropertyKey, string>> = {};
      const conditionsArray = formValue.conditions || [];
      
      conditionsArray.forEach((condition: any) => {
        if (condition.propertyKey && condition.propertyValue) {
          conditions[condition.propertyKey as SkuPropertyKey] = condition.propertyValue;
        }
      });

      const payload = {
        sku: formValue.sku || '',
        conditions
      };

      try {
        let response;
        if (this.isEditMode()) {
          // Update existing mapping
          response = await this.api.updateSkuMapping(this.mappingId()!, payload).toPromise();
        } else {
          // Create new mapping
          response = await this.api.createSkuMapping(payload).toPromise();
        }

        if (response && response.status && response.status >= 200 && response.status < 300) {
          // Success
          const wasEditMode = this.isEditMode();
          this.toastr.success(
            wasEditMode ? 'SKU mapping updated successfully' : 'SKU mapping created successfully'
          );
          
          // Reset form for new entry instead of navigating away
          if (wasEditMode) {
            // In edit mode, stay on the page but show success
            // Optionally could navigate to list or stay for further edits
            // For now, we'll reset to create mode
            this.mappingId.set(null);
            this.mapping.set(null);
            this.router.navigate(['/stock-management/sku-mappings/add'], { replaceUrl: true });
          }
          
          // Reset the form for a new mapping
          this.resetForm();
        } else {
          throw new Error(response?.message || 'Failed to save mapping');
        }
      } catch (error: any) {
        console.error('Failed to save mapping:', error);
        
        // Handle specific error cases
        let errorMessage = 'Failed to save mapping';
        
        if (error?.status === 409) {
          errorMessage = 'A mapping with these conditions already exists';
        } else if (error?.status === 400) {
          errorMessage = error?.error?.message || 'Invalid mapping data';
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        this.errorMessage.set(errorMessage);
        this.toastr.error(errorMessage);
      } finally {
        this.submitting.set(false);
      }
    }
  }

  // Helper to get property label safely
  getPropertyLabel(key: string | null | undefined): string {
    if (!key) return '';
    return SKU_PROPERTY_LABELS[key as SkuPropertyKey] || key;
  }

  // Helper to get form control error messages
  getFieldError(controlName: string): string {
    const control = this.form.get(controlName);
    if (control?.invalid && control?.touched) {
      if (control.errors?.['required']) {
        return `${SKU_PROPERTY_LABELS[controlName as SkuPropertyKey] || controlName} is required`;
      }
      if (control.errors?.['minlength']) {
        return `${SKU_PROPERTY_LABELS[controlName as SkuPropertyKey] || controlName} must not be empty`;
      }
    }
    return '';
  }

  // Helper to get condition array error messages
  getConditionsError(): string {
    const conditionsControl = this.form.get('conditions');
    if (conditionsControl?.invalid && conditionsControl?.touched) {
      if (conditionsControl.errors?.['noConditions']) {
        return 'At least one condition is required';
      }
    }
    return '';
  }

  // Helper to get condition field errors
  getConditionFieldError(index: number, field: string): string {
    const conditionGroup = this.conditionsArray().at(index) as FormGroup;
    const control = conditionGroup.get(field);
    
    if (control?.invalid && control?.touched) {
      if (control.errors?.['required']) {
        return field === 'propertyKey' ? 'Property is required' : 'Value is required';
      }
    }
    return '';
  }
}
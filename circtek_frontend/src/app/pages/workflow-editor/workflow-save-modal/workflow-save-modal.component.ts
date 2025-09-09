import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// Interface matching expected input
interface IWorkflow {
  id?: string | number;
  name?: string;
  description?: string;
  canvas_state?: any; // Keeping this general for now
  client_id?: string | number;
}

@Component({
  selector: 'app-workflow-save-modal',
  templateUrl: './workflow-save-modal.component.html',
  styleUrls: ['./workflow-save-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class WorkflowSaveModalComponent implements OnInit, OnChanges {
  @Input() workflowData: IWorkflow | null = null;
  @Input() isEditing: boolean = false;
  @Input() clientOptions: { id: string | number; name: string }[] = []; // Assuming structure
  // When set by the parent after a successful save, navigates to the edit URL
  @Input() savedId: string | number | null = null;

  @Output() save = new EventEmitter<{ name: string; description: string; clientId?: string | number }>();
  @Output() cancel = new EventEmitter<void>();
  
  // Computed property for visibility
  get visible(): boolean {
    return !!this.workflowData;
  }

  workflowForm: FormGroup;
  isSaving: boolean = false;
  saveError: string = '';

  constructor(private fb: FormBuilder, private router: Router) {
    this.workflowForm = this.fb.group({
      name: ['', [Validators.required, this.trimmedRequiredValidator]],
      description: ['']
    });

    // Debug form status changes
    this.workflowForm.statusChanges.subscribe(status => {
      console.log('Form status changed:', status, 'Valid:', this.workflowForm.valid);
    });

    this.workflowForm.valueChanges.subscribe(value => {
      console.log('Form value changed:', value, 'Form valid:', this.workflowForm.valid);
    });
  }

  ngOnInit(): void {
    this.resetForm();
  }

  // Called when the modal is shown or input data changes
  ngOnChanges(changes: SimpleChanges): void {
    // Reset form when workflowData changes
    if (changes['workflowData'] && this.workflowData) {
      this.resetForm();
    }
    // If parent provides a saved id after successful create, replace the URL to edit page
    if (changes['savedId'] && this.savedId) {
      this.router.navigate(['/workflow-editor', this.savedId], { replaceUrl: true });
    }
     // If clientOptions load after init, potentially set default client
     if (changes['clientOptions'] && this.clientOptions.length > 0 && !this.workflowForm.get('clientId')?.value) {
        // Optionally set a default client if creating new and options are available
        // if (!this.isEditing) {
        //   this.workflowForm.patchValue({ clientId: this.clientOptions[0].id });
        // }
    }
  }

  // Validator: ensures name is not only whitespace
  private trimmedRequiredValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').toString();
    return value.trim().length > 0 ? null : { required: true };
  };

  // Convenience getter for form fields
  get f() {
    return this.workflowForm.controls;
  }

  resetForm(): void {
    this.isSaving = false;
    this.saveError = ''; // Reset error state
    if (this.isEditing && this.workflowData) {
      this.workflowForm.patchValue({
        name: this.workflowData.name || '',
        description: this.workflowData.description || '',
        clientId: this.workflowData.client_id || '', // Use client_id
      });
    } else {
      this.workflowForm.reset({
        name: '',
        description: '',
        clientId: '', // Start with no client selected for new workflows
      });
    }
  }

  // Save the workflow data
  saveWorkflow(): void {
    if (this.workflowForm.invalid) {
        this.workflowForm.markAllAsTouched(); // Highlight errors
        return;
    }

    this.isSaving = true;
    this.saveError = ''; // Clear any previous errors
    
    // Prepare form data (canvas_state is handled by the parent)
    const formData = {
      name: this.workflowForm.value.name.trim(), // Trim the name before saving
      description: this.workflowForm.value.description || '',
      clientId: this.workflowForm.value.clientId || undefined // Send undefined if empty
    };

    this.save.emit(formData);

    // Note: Don't reset isSaving here - parent component will handle success/error
  }

  // Method to call from template
  submitForm(): void {
    this.saveWorkflow();
  }

  // Close the modal
  close(): void {
    this.cancel.emit();
    this.resetForm(); // Reset form on explicit cancel
  }

  // Method for parent to call on successful save
  onSaveSuccess(): void {
    this.isSaving = false;
    this.saveError = '';
    this.close();
  }

  // Method for parent to call on save error
  onSaveError(errorMessage: string): void {
    this.isSaving = false;
    this.saveError = errorMessage;
  }
}

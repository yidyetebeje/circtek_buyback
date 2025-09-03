import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { GenericModalComponent, ModalAction } from '../../../shared/components/generic-modal/generic-modal.component';

// Interface for the data passed to the modal
export interface DocumentModalData {
  id?: number;
  name?: string;
  description?: string;
  is_published?: boolean;
  client_id?: number;
  canvas_state?: object | string; // Keep canvas state separate
  version?: number;
}

// Interface for the data emitted on save
export interface DocumentFormData {
  name: string;
  description: string;
  is_published: boolean;
  clientId?: number | string; // Optional client ID
  canvas_state: object | string; // Include canvas state in emitted data
}

// Define an interface for the Client data if not already defined globally
export interface Client {
  id: number | string;
  name: string;
}

@Component({
  selector: 'app-document-save-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericModalComponent
  ],
  templateUrl: './document-save-modal.component.html',
  styleUrls: ['./document-save-modal.component.scss']
})
export class DocumentSaveModalComponent implements OnInit, OnChanges {
  @Input() visible: boolean = false;
  @Input() isEditing: boolean = false;
  @Input() documentData: DocumentModalData | null = null;
  @Input() clientOptions: Client[] = []; // Example client options

  @Output() save = new EventEmitter<DocumentFormData>();
  @Output() cancel = new EventEmitter<void>();

  documentForm: FormGroup;
  isSaving: boolean = false;

  get modalTitle(): string {
    return this.isEditing ? 'Update Document' : 'Save New Document';
  }

  get modalActions(): ModalAction[] {
    return [
      {
        label: this.isEditing ? 'Update' : 'Save',
        variant: 'primary',
        disabled: this.documentForm.invalid || this.isSaving,
        loading: this.isSaving,
        action: 'save'
      },
      {
        label: 'Close',
        variant: 'ghost',
        action: 'close'
      }
    ];
  }

  constructor(private fb: FormBuilder) {
    // Initialize the form group
    this.documentForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      is_published: [true], // Default to Draft/Not Published
      clientId: [''] // Keep if client selection is needed
    });
  }

  // Preserve the canvas state to prevent it from being lost
  private preserveCanvasState(): void {
    if (this.documentData?.canvas_state) {
      // Store the canvas state in a private property to ensure it's not lost
      (this as any)._preservedCanvasState = this.documentData.canvas_state;
    }
  }

  // Get the preserved canvas state
  private getPreservedCanvasState(): object | string | null {
    return (this as any)._preservedCanvasState || this.documentData?.canvas_state || null;
  }

  ngOnInit(): void {
    this.resetForm();
    this.preserveCanvasState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Only reset form when visibility changes from false to true, not when data changes
    // This prevents the form from being reset when the modal is already visible
    if (changes['visible'] && this.visible && !changes['visible'].previousValue) {
      this.resetForm();
    }
    
    // Always preserve canvas state when document data changes
    if (changes['documentData'] && this.documentData) {
      this.preserveCanvasState();
    }
  }

  // Convenience getter for form fields
  get f() {
    return this.documentForm.controls;
  }

  // Reset the form based on whether it's editing or creating
  private resetForm(): void {
    if (this.isEditing && this.documentData) {
      this.documentForm.patchValue({
        name: this.documentData.name || '',
        description: this.documentData.description || '',
        is_published: this.documentData.is_published === true, // Ensure boolean
        clientId: this.documentData.client_id || '' // Use client_id from data
      });
    } else {
      // Reset for new document creation
      this.documentForm.reset({
        name: '',
        description: '',
        is_published: false,
        clientId: this.clientOptions.length > 0 ? this.clientOptions[0].id : '' // Default client if needed
      });
    }
    this.isSaving = false; // Reset saving state
    // Note: We do NOT reset the canvas_state here - it should be preserved
  }

  // Prepare and emit the save event
  saveDocument(): void {
    if (this.documentForm.invalid) {
      // Mark fields as touched to show errors
      Object.values(this.documentForm.controls).forEach(control => {
        control.markAsTouched();
      });
      return;
    }

    this.isSaving = true;

    // Prepare form data to emit, including the essential canvas_state
    const formData: DocumentFormData = {
      name: this.documentForm.value.name,
      description: this.documentForm.value.description || '',
      is_published: true,
      canvas_state: this.getPreservedCanvasState() || {} // Use preserved canvas state
    };

    // Only include clientId if it has a value
    if (this.documentForm.value.clientId) {
      formData.clientId = this.documentForm.value.clientId;
    }

    console.log('Emitting save event with data:', formData);
    console.log('Canvas state being preserved:', this.getPreservedCanvasState());
    this.save.emit(formData);

    // Optionally reset saving state after a delay, assuming parent closes modal
    setTimeout(() => {
      this.isSaving = false;
    }, 1500);
  }

  // Alias for calling saveDocument from the template submit button
  submitForm(): void {
    this.saveDocument();
  }

  // Emit the cancel event and optionally reset the form
  close(): void {
    this.cancel.emit();
    // Optionally reset form on close, or let parent handle state
    // this.resetForm();
  }

  onModalClose(): void {
    this.close();
  }

  onModalAction(action: string): void {
    if (action === 'save') {
      this.submitForm();
    } else if (action === 'close') {
      this.close();
    }
  }
} 
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GenericModalComponent, ModalAction } from '../../../shared/components/generic-modal/generic-modal.component';
import { INode } from '../decision-node/decision-node.component';

@Component({
  selector: 'app-parrot-test-options-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericModalComponent],
  templateUrl: './parrot-test-options-modal.component.html',
  styleUrls: ['./parrot-test-options-modal.component.scss']
})
export class ParrotTestOptionsModal implements OnInit, OnChanges {
  @Input() nodeData: INode | null = null;
  @Input() isOpen: boolean = false;

  @Output() save = new EventEmitter<{ recordDurationPerSide: string }>();
  @Output() cancel = new EventEmitter<void>();

  optionsForm: FormGroup;
  isSaving: boolean = false;

  get modalActions(): ModalAction[] {
    return [
      {
        label: 'Cancel',
        variant: 'ghost',
        action: 'cancel'
      },
      {
        label: 'Save',
        variant: 'accent',
        disabled: this.optionsForm?.invalid || this.isSaving,
        loading: this.isSaving,
        action: 'save'
      }
    ];
  }

  constructor(private fb: FormBuilder) {
    this.optionsForm = this.fb.group({
      recordDurationPerSide: [Validators.required, Validators.pattern("([0-9]{1,2}:)?([0-9]{1,2}:)?[0-9]{1,2}")]
    });
  }

  ngOnInit(): void {
    this.resetForm();
  }

  // Called when the modal is shown or input data changes
  ngOnChanges(changes: SimpleChanges): void {
    // Reset form when modal becomes visible or nodeData changes while visible
    if (changes['nodeData']) {
      this.resetForm();
    }
  }

  // Convenience getter for form fields
  get f() {
    return this.optionsForm.controls;
  }

  resetForm(): void {
    this.isSaving = false;
    this.optionsForm.reset({
      recordDurationPerSide: this.nodeData?.data?.["recordDurationPerSide"] ?? "5",
    });
  }

  // Save the workflow data
  saveOptions(): void {
    if (this.optionsForm.invalid) {
        this.optionsForm.markAllAsTouched(); // Highlight errors
        return;
    }

    this.isSaving = true;
    const formData = {
      recordDurationPerSide: this.optionsForm.value.recordDurationPerSide
    };

    this.save.emit(formData);
  }

  // Method to call from template
  submitForm(): void {
    this.saveOptions();
  }

  // Close the modal
  close(): void {
    this.cancel.emit();
    this.resetForm(); // Reset form on explicit cancel
  }

  // Handle modal actions
  onModalAction(action: string): void {
    switch (action) {
      case 'cancel':
        this.close();
        break;
      case 'save':
        this.submitForm();
        break;
    }
  }
}

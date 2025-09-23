import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { INode } from '../decision-node/decision-node.component';

@Component({
  selector: 'app-battery-drain-test-options-modal',
  templateUrl: './battery-drain-test-options-modal.component.html',
  styleUrls: ['./battery-drain-test-options-modal.component.scss']
})
export class BatteryDrainTestOptionsModal implements OnInit, OnChanges {
  @Input() nodeData: INode | null = null;

  @Output() save = new EventEmitter<{ duration: string }>();
  @Output() cancel = new EventEmitter<void>();

  optionsForm: FormGroup;
  isSaving: boolean = false;

  constructor(private fb: FormBuilder) {
    this.optionsForm = this.fb.group({
      duration: [Validators.required, Validators.pattern("([0-9]{1,2}:)?([0-9]{1,2}:)?[0-9]{1,2}")],
      threshold: [Validators.required, Validators.pattern("[0-9]+%?")]
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
      duration: this.nodeData?.data?.["duration"] ?? "5:00",
      threshold: (this.nodeData?.data?.["threshold"] ?? 5) + "%"
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
      duration: this.optionsForm.value.duration,
      threshold: parseInt(this.optionsForm.value.threshold)
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
}

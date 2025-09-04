import { ChangeDetectionStrategy, Component, computed, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormGroupDirective, ControlContainer } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Save, Edit, Share } from 'lucide-angular';
import { FileUploadComponent } from '../file-upload/file-upload.component';

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'date' | 'file';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: any }>;
  disabled?: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface FormAction {
  label: string;
  type: 'submit' | 'button';
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-generic-form-page',
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, FileUploadComponent],
  templateUrl: './generic-form-page.component.html',
  styleUrls: ['./generic-form-page.component.css'],
  viewProviders: [
    { provide: ControlContainer, useExisting: FormGroupDirective }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericFormPageComponent {
  // Inputs
  title = input.required<string>();
  subtitle = input<string>();
  form = input.required<FormGroup>();
  fields = input.required<FormField[]>();
  actions = input<FormAction[]>([]);
  // Backward compat: `loading` used for initial data fetch overlay/disable
  loading = input<boolean>(false);
  // New: separate submitting flag for form submission state
  submitting = input<boolean>(false);
  // New: error message banner support
  error = input<string | null>(null);
  showBackButton = input<boolean>(true);
  backUrl = input<string>('../');
  submitLabel = input<string>('Save');

  // Outputs
  formSubmit = output<any>();
  actionClick = output<{ action: string; data?: any }>();
  backClick = output<void>();

  private router = inject(Router);

  // Icons
  readonly ArrowLeft = ArrowLeft;
  readonly Save = Save;
  readonly Edit = Edit;
  readonly Share = Share;

  // Computed values
  submitAction = computed(() => {
    const actions = this.actions();
    for (let i = 0; i < actions.length; i++) {
      if (actions[i].type === 'submit') {
        return actions[i];
      }
    }
    return undefined;
  });

  otherActions = computed(() => {
    const actions = this.actions();
    const result: FormAction[] = [];
    for (let i = 0; i < actions.length; i++) {
      if (actions[i].type !== 'submit') {
        result.push(actions[i]);
      }
    }
    return result;
  });

  onSubmit() {
    if (this.form().valid) {
      this.formSubmit.emit(this.form().value);
    } else {
      this.markAllFieldsAsTouched();
    }
  }

  onActionClick(action: FormAction) {
    this.actionClick.emit({ action: action.label, data: this.form().value });
  }

  onBackClick() {
    this.backClick.emit();
  }

  navigateBack() {
    this.router.navigate([this.backUrl()]);
  }

  getFieldError(field: FormField): string | null {
    const control = this.form().get(field.key);
    if (!control || !control.touched || !control.errors) {
      return null;
    }

    const errors = control.errors;
    if (errors['required']) {
      return `${field.label} is required`;
    }
    if (errors['email']) {
      return 'Please enter a valid email address';
    }
    if (errors['minlength']) {
      return `${field.label} must be at least ${errors['minlength'].requiredLength} characters`;
    }
    if (errors['maxlength']) {
      return `${field.label} cannot exceed ${errors['maxlength'].requiredLength} characters`;
    }
    if (errors['pattern']) {
      return `${field.label} format is invalid`;
    }
    if (errors['min']) {
      return `${field.label} must be at least ${errors['min'].min}`;
    }
    if (errors['max']) {
      return `${field.label} cannot exceed ${errors['max'].max}`;
    }

    return 'Invalid input';
  }

  isFieldInvalid(field: FormField): boolean {
    const control = this.form().get(field.key);
    return !!(control && control.invalid && control.touched);
  }

  private markAllFieldsAsTouched() {
    Object.keys(this.form().controls).forEach(key => {
      this.form().get(key)?.markAsTouched();
    });
  }

  getButtonClass(action: FormAction): string {
    const baseClass = 'btn';
    const variantClass = {
      primary: 'btn-accent',
      secondary: 'btn-secondary', 
      danger: 'btn-error',
      ghost: 'btn-ghost'
    }[action.variant];
    
    return `${baseClass} ${variantClass}`;
  }
}


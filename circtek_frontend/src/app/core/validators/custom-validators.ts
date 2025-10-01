import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator that rejects values that are empty or contain only whitespace
 */
export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value == null || control.value === '') {
      // Let required validator handle empty values
      return null;
    }

    const isWhitespace = (control.value || '').toString().trim().length === 0;
    return isWhitespace ? { whitespace: { value: control.value } } : null;
  };
}

/**
 * Validator that trims whitespace and rejects if empty after trimming
 * Use this when you want to ensure non-empty content after trimming
 */
export function requiredNoWhitespace(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value || '').toString().trim();
    
    if (value.length === 0) {
      return { requiredNoWhitespace: { value: control.value } };
    }
    
    return null;
  };
}

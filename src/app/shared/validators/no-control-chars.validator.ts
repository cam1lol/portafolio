import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const CONTROL_CHARS = /[\x00-\x1F\x7F]/;

export function noControlCharsValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string' || value.length === 0) {
      return null;
    }
    return CONTROL_CHARS.test(value) ? { controlChars: true } : null;
  };
}

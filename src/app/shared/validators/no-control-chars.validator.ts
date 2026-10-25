import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const CONTROL_CHARS = /[\x00-\x1F\x7F]/;
/** Same set minus line feed and carriage return, for multiline textareas. */
const CONTROL_CHARS_EXCEPT_NEWLINES = /[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/;

export function noControlCharsValidator(options: { allowNewlines?: boolean } = {}): ValidatorFn {
  const pattern = options.allowNewlines ? CONTROL_CHARS_EXCEPT_NEWLINES : CONTROL_CHARS;
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string' || value.length === 0) {
      return null;
    }
    return pattern.test(value) ? { controlChars: true } : null;
  };
}

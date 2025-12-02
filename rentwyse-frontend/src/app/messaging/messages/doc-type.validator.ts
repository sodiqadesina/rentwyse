import { AbstractControl, ValidatorFn } from "@angular/forms";

export const docTypeValidator = (allowedTypes: string[]): ValidatorFn => {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const file = control.value as File;
    if (file && typeof file.name === 'string') {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(extension!)) {
        return { invalidMimeType: true };
      }
    }
    return null;
  };
};
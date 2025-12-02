import { AbstractControl } from "@angular/forms";
import { Observable, Observer, of } from "rxjs";

export const mimeType = (
  control: AbstractControl
): Promise<{ [key: string]: any } | null> | Observable<{ [key: string]: any } | null> => {
  
  // Check for string values or null
  if (typeof(control.value) === 'string' || !control.value) {
    return of(null);
  }
  
  // Check if control value is File or FileList
  let files: File[];
  if (control.value instanceof File) {
    files = [control.value];
  } else if (control.value instanceof FileList) {
    files = Array.from(control.value);
  } else {
    return of(null); // Return if the control value is neither
  }

  return new Observable((observer: Observer<{ [key: string]: any } | null>) => {
    let checkedFiles = 0;

    files.forEach(file => {
      const fileReader = new FileReader();

      fileReader.addEventListener("loadend", () => {
        const arr = new Uint8Array(fileReader.result as ArrayBuffer).subarray(0, 4);
        let header = "";
        for (let i = 0; i < arr.length; i++) {
          header += arr[i].toString(16);
        }
        const validHeaders = [
          "89504e47",
          "ffd8ffe0",
          "ffd8ffe1",
          "ffd8ffe2",
          "ffd8ffe3",
          "ffd8ffe8"
        ];
        if (!validHeaders.includes(header)) {
          observer.next({ invalidMimeType: true });
          observer.complete();
        } else {
          checkedFiles++;
          if (checkedFiles === files.length) {
            observer.next(null); // All files have been checked
            observer.complete();
          }
        }
      });

      fileReader.readAsArrayBuffer(file);
    });
  });
};

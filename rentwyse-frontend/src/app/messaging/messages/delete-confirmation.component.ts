// confirmation-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-confirmation-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content class="dialog-content">{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onClose(true)">Confirm</button>
      <button mat-button (click)="onClose(false)">Cancel</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      min-width: 250px;
    }
    mat-dialog-actions {
      display: flex;
      justify-content: flex-end;
    }
    button {
      margin-left: 8px;
    }
  `]
})
export class ConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string }
  ) {}

  onClose(confirm: boolean): void {
    this.dialogRef.close(confirm);
  }
}

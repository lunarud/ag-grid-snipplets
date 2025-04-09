// email-editor-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-email-editor-dialog',
  template: `
    <h2 mat-dialog-title>Email Editor</h2>
    <mat-dialog-content>
      <form [formGroup]="emailForm" class="email-form">
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>To</mat-label>
          <input matInput formControlName="to" placeholder="recipient@example.com">
          <mat-error *ngIf="emailForm.get('to')?.hasError('email')">
            Please enter a valid email address
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Subject</mat-label>
          <input matInput formControlName="subject">
        </mat-form-field>

        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Message</mat-label>
          <textarea matInput formControlName="body" rows="5"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              [disabled]="!emailForm.valid"
              (click)="onSend()">Send</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .email-form {
      display: flex;
      flex-direction: column;
      min-width: 300px;
    }
    .full-width {
      width: 100%;
      margin-bottom: 15px;
    }
  `]
})
export class EmailEditorDialogComponent {
  emailForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<EmailEditorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { rowData: any },
    private fb: FormBuilder
  ) {
    this.emailForm = this.fb.group({
      to: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      body: ['', Validators.required]
    });

    // Pre-populate form with row data if available
    if (data?.rowData) {
      this.emailForm.patchValue({
        subject: `Regarding Item ${data.rowData.id}`,
        body: `Hello,\n\nThis email is regarding ${data.rowData.description} with value ${data.rowData.value}.\n\nRegards,`
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSend(): void {
    if (this.emailForm.valid) {
      this.dialogRef.close(this.emailForm.value);
    }
  }
}

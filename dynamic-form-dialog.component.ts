// dynamic-form-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'textarea' | 'select';
  required?: boolean;
  options?: { value: any; label: string }[]; // For select fields
  value?: any;
}

@Component({
  selector: 'app-dynamic-form-dialog',
  template: `
    <h2 mat-dialog-title>Edit Details</h2>
    <mat-dialog-content>
      <form [formGroup]="dynamicForm" class="dynamic-form">
        <ng-container *ngFor="let field of fields">
          <mat-form-field appearance="fill" class="full-width" *ngIf="field.type !== 'textarea' && field.type !== 'select'">
            <mat-label>{{ field.label }}</mat-label>
            <input matInput 
                   [type]="field.type"
                   [formControlName]="field.name"
                   [placeholder]="field.label">
            <mat-error *ngIf="dynamicForm.get(field.name)?.hasError('required')">
              {{ field.label }} is required
            </mat-error>
            <mat-error *ngIf="dynamicForm.get(field.name)?.hasError('email')">
              Please enter a valid email
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width" *ngIf="field.type === 'textarea'">
            <mat-label>{{ field.label }}</mat-label>
            <textarea matInput 
                      [formControlName]="field.name"
                      rows="4"></textarea>
            <mat-error *ngIf="dynamicForm.get(field.name)?.hasError('required')">
              {{ field.label }} is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width" *ngIf="field.type === 'select'">
            <mat-label>{{ field.label }}</mat-label>
            <mat-select [formControlName]="field.name">
              <mat-option *ngFor="let option of field.options" [value]="option.value">
                {{ option.label }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="dynamicForm.get(field.name)?.hasError('required')">
              {{ field.label }} is required
            </mat-error>
          </mat-form-field>
        </ng-container>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button 
              color="primary"
              [disabled]="!dynamicForm.valid"
              (click)="onSubmit()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dynamic-form {
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
export class DynamicFormDialogComponent implements OnInit {
  dynamicForm: FormGroup;
  fields: FormFieldConfig[] = [];

  constructor(
    public dialogRef: MatDialogRef<DynamicFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { fields: FormFieldConfig[] },
    private fb: FormBuilder
  ) {
    this.dynamicForm = this.fb.group({});
  }

  ngOnInit() {
    this.fields = this.data.fields || [];
    this.buildForm();
  }

  buildForm() {
    this.fields.forEach(field => {
      const validators = field.required ? [Validators.required] : [];
      if (field.type === 'email') {
        validators.push(Validators.email);
      }
      this.dynamicForm.addControl(
        field.name,
        this.fb.control(field.value || '', validators)
      );
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.dynamicForm.valid) {
      this.dialogRef.close(this.dynamicForm.value);
    }
  }
}

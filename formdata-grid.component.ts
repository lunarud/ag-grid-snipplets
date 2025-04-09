// data-grid.component.ts (updated parts only)
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DynamicFormDialogComponent, FormFieldConfig } from './dynamic-form-dialog.component';
// ... other imports remain the same

@Component({
  // ... existing component decorator remains the same
})
export class DataGridComponent implements OnInit {
  // ... existing properties remain the same

  constructor(private dialog: MatDialog) {
    // ... existing constructor code remains the same
  }

  // ... existing methods remain the same

  onDetailRowClicked(params: any) {
    const formFields: FormFieldConfig[] = [
      {
        name: 'id',
        label: 'ID',
        type: 'text',
        required: true,
        value: params.data.id
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: true,
        value: params.data.description
      },
      {
        name: 'value',
        label: 'Value',
        type: 'number',
        required: true,
        value: params.data.value
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ],
        value: 'active'
      }
    ];

    const dialogRef = this.dialog.open(DynamicFormDialogComponent, {
      width: '500px',
      data: { fields: formFields }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Form data:', result);
        // Here you would typically update your data
        // this.updateData(params.data.id, result);
      }
    });
  }
}

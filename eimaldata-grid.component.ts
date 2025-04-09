// data-grid.component.ts (updated parts only)
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EmailEditorDialogComponent } from './email-editor-dialog.component';
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
    const dialogRef = this.dialog.open(EmailEditorDialogComponent, {
      width: '500px',
      data: { rowData: params.data }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Email to send:', result);
        // Here you would typically call an email service
        // this.emailService.sendEmail(result).subscribe();
      }
    });
  }
}

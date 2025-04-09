// email-link-renderer.component.ts
import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { MatDialog } from '@angular/material/dialog';
import { EmailEditorDialogComponent } from './email-editor-dialog.component';

@Component({
  selector: 'app-email-link-renderer',
  template: `
    <a href="javascript:void(0)" 
       (click)="openEmailDialog()"
       class="email-link">
      {{ value }}
    </a>
  `,
  styles: [`
    .email-link {
      color: #1976d2;
      text-decoration: none;
      cursor: pointer;
    }
    .email-link:hover {
      text-decoration: underline;
    }
  `]
})
export class EmailLinkRendererComponent implements ICellRendererAngularComp {
  private params: ICellRendererParams | undefined;
  public value: string | undefined;

  constructor(private dialog: MatDialog) {}

  agInit(params: ICellRendererParams): void {
    this.params = params;
    this.value = params.value || 'Send Email';
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    this.value = params.value || 'Send Email';
    return true;
  }

  openEmailDialog(): void {
    if (this.params?.data) {
      const dialogRef = this.dialog.open(EmailEditorDialogComponent, {
        width: '500px',
        data: { rowData: this.params.data }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          console.log('Email to send:', result);
          // Add your email sending logic here
        }
      });
    }
  }
}

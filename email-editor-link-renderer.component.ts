// email-editor-link-renderer.component.ts
import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { MatDialog } from '@angular/material/dialog';
import { EmailEditorDialogComponent } from './email-editor-dialog.component';

@Component({
  selector: 'app-email-editor-link-renderer',
  template: `
    <span class="email-container">
      <mat-icon class="email-icon">email</mat-icon>
      <a href="javascript:void(0)" 
         (click)="openEmailEditor()"
         class="email-link">
        {{ displayValue }}
      </a>
    </span>
  `,
  styles: [`
    .email-container {
      display: flex;
      align-items: center;
      height: 100%;
    }
    .email-icon {
      margin-right: 8px;
      font-size: 18px;
      height: 18px;
      width: 18px;
      color: #666;
    }
    .email-link {
      color: #0277bd;
      text-decoration: none;
      cursor: pointer;
    }
    .email-link:hover {
      text-decoration: underline;
      color: #01579b;
    }
  `]
})
export class EmailEditorLinkRendererComponent implements ICellRendererAngularComp {
  private params: ICellRendererParams | undefined;
  public displayValue: string | undefined;

  constructor(private dialog: MatDialog) {}

  agInit(params: ICellRendererParams): void {
    this.params = params;
    // Use description field as link text, fallback to 'Send Email'
    this.displayValue = params.data?.description || 'Send Email';
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    this.displayValue = params.data?.description || 'Send Email';
    return true;
  }

  openEmailEditor(): void {
    if (this.params?.data) {
      const dialogRef = this.dialog.open(EmailEditorDialogComponent, {
        width: '500px',
        data: { rowData: this.params.data }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          console.log('Email data:', result);
          // Implement your email sending logic here
        }
      });
    }
  }
}

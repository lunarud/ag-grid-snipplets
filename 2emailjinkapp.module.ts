// app.module.ts (updated)
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon'; // Added for icons
import { ReactiveFormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { DataGridComponent } from './data-grid.component';
import { EmailEditorDialogComponent } from './email-editor-dialog.component';
import { EmailEditorLinkRendererComponent } from './email-editor-link-renderer.component';

@NgModule({
  declarations: [
    DataGridComponent,
    EmailEditorDialogComponent,
    EmailEditorLinkRendererComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ReactiveFormsModule,
    AgGridModule
  ],
  bootstrap: [DataGridComponent]
})
export class AppModule { }

// app.module.ts (updated)
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { DataGridComponent } from './data-grid.component';
import { DynamicFormDialogComponent } from './dynamic-form-dialog.component';

@NgModule({
  declarations: [
    DataGridComponent,
    DynamicFormDialogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    AgGridModule
  ],
  bootstrap: [DataGridComponent]
})
export class AppModule { }

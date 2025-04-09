https://medium.com/fsmk-engineering/how-to-use-camunda-as-an-angular-form-builder-5d349ff4ae6d

// app.module.ts (updated)
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClientModule } from '@angular/common/http';
import { AgGridModule } from 'ag-grid-angular';
import { DataGridComponent } from './data-grid.component';
import { BpmnViewerDialogComponent } from './bpmn-viewer-dialog.component';
import { BpmnLinkRendererComponent } from './bpmn-link-renderer.component';
import { CamundaService } from './camunda.service';

@NgModule({
  declarations: [
    DataGridComponent,
    BpmnViewerDialogComponent,
    BpmnLinkRendererComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    HttpClientModule,
    AgGridModule
  ],
  providers: [CamundaService],
  bootstrap: [DataGridComponent]
})
export class AppModule { }

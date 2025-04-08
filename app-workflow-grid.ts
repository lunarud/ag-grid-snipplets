/* workflow-grid.component.scss */
:host {
  display: block;
  height: 100%;
  width: 100%;
}

.ag-theme-alpine {
  height: 100%;
  width: 100%;
}

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AgGridModule } from 'ag-grid-angular';
import { AppComponent } from './app.component';
import { WorkflowGridComponent } from './workflow-grid/workflow-grid.component';

@NgModule({
  declarations: [
    AppComponent,
    WorkflowGridComponent
  ],
  imports: [
    BrowserModule,
    AgGridModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

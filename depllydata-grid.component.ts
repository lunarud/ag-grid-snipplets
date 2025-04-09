// data-grid.component.ts
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CamundaService } from './camunda.service';
import { BpmnLinkRendererComponent } from './bpmn-link-renderer.component';
import { GridOptions } from 'ag-grid-community';
import { BpmnViewerDialogComponent } from './bpmn-viewer-dialog.component';

@Component({
  selector: 'app-data-grid',
  template: `
    <div style="height: 600px; width: 100%;">
      <ag-grid-angular
        style="width: 100%; height: 100%;"
        class="ag-theme-material"
        [gridOptions]="gridOptions"
        [rowData]="rowData"
        [frameworkComponents]="frameworkComponents"
        (gridReady)="onGridReady($event)">
      </ag-grid-angular>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class DataGridComponent implements OnInit {
  gridOptions: GridOptions;
  rowData: any[] = [];
  frameworkComponents: any;

  constructor(
    private camundaService: CamundaService,
    private dialog: MatDialog
  ) {
    this.frameworkComponents = {
      bpmnLinkRenderer: BpmnLinkRendererComponent
    };

    this.gridOptions = {
      masterDetail: true,
      detailCellRendererParams: {
        detailGridOptions: {
          columnDefs: [
            { field: 'id', headerName: 'Task ID' },
            { field: 'name', headerName: 'Task Name' },
            { field: 'assignee', headerName: 'Assignee' },
            { field: 'created', headerName: 'Created', valueFormatter: params => new Date(params.value).toLocaleString() },
            { field: 'due', headerName: 'Due Date', valueFormatter: params => params.value ? new Date(params.value).toLocaleString() : '' }
          ],
          defaultColDef: {
            sortable: true,
            filter: true,
            resizable: true
          }
        },
        getDetailRowData: (params) => {
          this.camundaService.getTasksForProcess(params.data.id)
            .subscribe(tasks => {
              params.successCallback(tasks);
            });
        }
      },
      columnDefs: [
        { field: 'id', headerName: 'Process Def. ID', hide: true },
        { field: 'key', headerName: 'Process Key' },
        { field: 'name', headerName: 'Process Name' },
        { field: 'version', headerName: 'Version' },
        { field: 'deploymentId', headerName: 'Deployment ID' },
        { 
          field: 'viewWorkflow', 
          headerName: 'View', 
          cellRenderer: 'bpmnLinkRenderer',
          width: 150
        }
      ],
      defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true
      }
    };
  }

  ngOnInit() {
    this.loadProcessDefinitions();
  }

  onGridReady(params: any) {
    params.api.sizeColumnsToFit();
  }

  private loadProcessDefinitions() {
    this.camundaService.getProcessDefinitions()
      .subscribe({
        next: (processes) => {
          this.rowData = processes;
        },
        error: (err) => {
          console.error('Error loading process definitions:', err);
        }
      });
  }
}

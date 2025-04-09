// data-grid.component.ts (updated parts only)
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EmailEditorLinkRendererComponent } from './email-editor-link-renderer.component';
// ... other imports remain the same

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
  // ... rest of the component decorator remains the same
})
export class DataGridComponent implements OnInit {
  gridOptions: GridOptions;
  rowData: any[] = [];
  frameworkComponents: any;

  constructor(private dialog: MatDialog) {
    this.frameworkComponents = {
      emailEditorLinkRenderer: EmailEditorLinkRendererComponent
    };

    this.gridOptions = {
      masterDetail: true,
      detailCellRendererParams: {
        detailGridOptions: {
          columnDefs: [
            { field: 'id', headerName: 'ID' },
            { field: 'description', headerName: 'Description' },
            { field: 'value', headerName: 'Value' },
            { 
              field: 'emailAction',
              headerName: 'Email',
              cellRenderer: 'emailEditorLinkRenderer',
              width: 200
            }
          ]
        },
        getDetailRowData: (params) => {
          params.successCallback(this.getDetailData(params.data));
        }
      },
      columnDefs: [
        { field: 'name', headerName: 'Name', rowGroup: true },
        { field: 'id', headerName: 'ID' },
        { field: 'status', headerName: 'Status' }
      ],
      defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true
      }
    };
  }

  // ... rest of the component remains the same
}

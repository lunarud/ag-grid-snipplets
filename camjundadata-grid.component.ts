// data-grid.component.ts (updated parts only)
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BpmnLinkRendererComponent } from './bpmn-link-renderer.component';

@Component({
  // ... existing template remains the same
})
export class DataGridComponent implements OnInit {
  gridOptions: GridOptions;
  rowData: any[] = [];
  frameworkComponents: any;

  constructor(private dialog: MatDialog) {
    this.frameworkComponents = {
      bpmnLinkRenderer: BpmnLinkRendererComponent
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
              field: 'viewWorkflow',
              headerName: 'Workflow',
              cellRenderer: 'bpmnLinkRenderer'
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
        { field: 'status', headerName: 'Status' },
        { 
          field: 'viewWorkflow',
          headerName: 'Workflow',
          cellRenderer: 'bpmnLinkRenderer'
        }
      ],
      defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true
      },
      context: {
        masterData: null // Will be set in row data
      }
    };
  }

  ngOnInit() {
    this.rowData = [
      { id: 1, name: 'Item 1', status: 'Active', processDefinitionId: 'your-process-definition-id' },
      // ... other rows
    ];
    this.gridOptions.context.masterData = this.rowData[0]; // Example, adjust as needed
  }

  // ... rest of the component remains the same
}

 // app.component.ts
import { Component } from '@angular/core';
import { ColDef, GridOptions, GridReadyEvent, IDetailCellRendererParams } from 'ag-grid-community';
import 'ag-grid-enterprise'; // Include if using Enterprise features (Master/Detail is free, though)

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private gridApi!: any;

  // Column definitions for master grid
  columnDefs: ColDef[] = [
    { field: 'name', cellRenderer: 'agGroupCellRenderer' },
    { field: 'account' }
  ];

  // Grid options for master grid
  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    masterDetail: true,
    detailCellRendererParams: {
      detailGridOptions: {
        columnDefs: [
          { field: 'callId', checkboxSelection: true },
          { field: 'direction' }
        ],
        rowSelection: 'multiple', // Enable multiple selection in detail grid
        onSelectionChanged: (params) => {
          const selectedRows = params.api.getSelectedRows();
          console.log('Selected rows in this detail grid:', selectedRows);
        }
      } as GridOptions,
      getDetailRowData: (params) => {
        // Simulate detail data (replace with your data source)
        params.successCallback(params.data.callRecords);
      }
    } as IDetailCellRendererParams
  };

  // Sample row data for master grid
  rowData = [
    {
      name: 'John Doe',
      account: '12345',
      callRecords: [
        { callId: 'C001', direction: 'Inbound' },
        { callId: 'C002', direction: 'Outbound' }
      ]
    },
    {
      name: 'Jane Smith',
      account: '67890',
      callRecords: [
        { callId: 'C003', direction: 'Inbound' },
        { callId: 'C004', direction: 'Outbound' }
      ]
    }
  ];

  // Called when the grid is ready
  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
  }

  // Get selected rows from a specific detail grid
  getSelectedRowsFromDetail(masterRowId: string) {
    const detailGridInfo = this.gridApi.getDetailGridInfo(`detail_${masterRowId}`);
    if (detailGridInfo) {
      const selectedRows = detailGridInfo.api.getSelectedRows();
      console.log(`Selected rows for master row ${masterRowId}:`, selectedRows);
      return selectedRows;
    } else {
      console.log(`No detail grid found for master row ${masterRowId}`);
      return [];
    }
  }

  // Get selected rows from all detail grids
  getSelectedRowsFromAllDetails() {
    const selectedRowsByDetail: { [key: string]: any[] } = {};
    this.gridApi.forEachDetailGridInfo((detailGridInfo: any) => {
      const detailId = detailGridInfo.id;
      const selectedRows = detailGridInfo.api.getSelectedRows();
      selectedRowsByDetail[detailId] = selectedRows;
    });
    console.log('Selected rows from all detail grids:', selectedRowsByDetail);
    return selectedRowsByDetail;
  }

  // Example: Trigger getting selected rows from a specific row
  onGetSelectedFromDetail() {
    this.getSelectedRowsFromDetail('0'); // Replace '0' with dynamic row ID if needed
  }

  // Example: Trigger getting selected rows from all details
  onGetSelectedFromAllDetails() {
    this.getSelectedRowsFromAllDetails();
  }
}

// workflow-grid.component.ts
import { Component, OnInit } from '@angular/core';
import { ColDef, GridOptions } from 'ag-grid-community';

@Component({
  selector: 'app-workflow-grid',
  templateUrl: './workflow-grid.component.html',
  styleUrls: ['./workflow-grid.component.scss']
})
export class WorkflowGridComponent implements OnInit {
  // Grid Options configuration
  public gridOptions: GridOptions = {
    masterDetail: true,
    detailCellRendererParams: {
      detailGridOptions: {
        columnDefs: [
          { field: 'taskId', headerName: 'Task ID', width: 100 },
          { field: 'taskName', headerName: 'Task Name' },
          { field: 'status', headerName: 'Status' },
          { field: 'assignee', headerName: 'Assignee' },
          { field: 'dueDate', headerName: 'Due Date' }
        ],
        defaultColDef: {
          flex: 1,
          sortable: true,
          filter: true
        }
      },
      getDetailRowData: (params) => {
        params.successCallback(params.data.tasks);
      }
    },
    defaultColDef: {
      flex: 1,
      sortable: true,
      filter: true
    },
    rowData: this.rowData
  };

  // Column Definitions for Master Grid
  public columnDefs: ColDef[] = [
    { field: 'workflowId', headerName: 'Workflow ID', width: 120 },
    { field: 'workflowName', headerName: 'Workflow Name' },
    { field: 'status', headerName: 'Status' },
    { field: 'createdDate', headerName: 'Created Date' },
    { field: 'priority', headerName: 'Priority' }
  ];

  // Static demo data
  public rowData = [
    {
      workflowId: 'WF001',
      workflowName: 'Client Onboarding',
      status: 'In Progress',
      createdDate: '2025-04-01',
      priority: 'High',
      tasks: [
        { taskId: 'T001', taskName: 'Collect Documents', status: 'Completed', assignee: 'John Doe', dueDate: '2025-04-03' },
        { taskId: 'T002', taskName: 'Verify Identity', status: 'In Progress', assignee: 'Jane Smith', dueDate: '2025-04-05' },
        { taskId: 'T003', taskName: 'Setup Account', status: 'Pending', assignee: 'Bob Wilson', dueDate: '2025-04-07' }
      ]
    },
    {
      workflowId: 'WF002',
      workflowName: 'Product Launch',
      status: 'Pending',
      createdDate: '2025-04-02',
      priority: 'Medium',
      tasks: [
        { taskId: 'T004', taskName: 'Design Campaign', status: 'Pending', assignee: 'Alice Brown', dueDate: '2025-04-10' },
        { taskId: 'T005', taskName: 'Prepare Materials', status: 'Pending', assignee: 'Tom Clark', dueDate: '2025-04-12' }
      ]
    }
  ];

  constructor() { }

  ngOnInit(): void { }

  // Optional: Method to handle grid ready event
  onGridReady(params: any) {
    params.api.sizeColumnsToFit();
  }
}

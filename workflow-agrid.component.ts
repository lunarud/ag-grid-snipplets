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

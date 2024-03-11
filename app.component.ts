import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import {
  ColDef,
  ColGroupDef,
  GridReadyEvent,
  RowSpanParams,
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import '../styles.css';
import { Shot } from './interfaces';

@Component({
  selector: 'my-app',
  template: `<ag-grid-angular
    style="width: 100%; height: 100%;"
    class="ag-theme-alpine-dark"
    [columnDefs]="columnDefs"
    [defaultColDef]="defaultColDef"
    [suppressRowTransform]="true"
    [rowData]="rowData"
    (gridReady)="onGridReady($event)"
  ></ag-grid-angular> `,
})
export class AppComponent {
  public columnDefs: (ColDef | ColGroupDef)[] = [
    {
      headerName: 'Code',
      field: 'code',
      rowSpan: rowSpan,
      cellClass: 'cell',
    },
    {
      headerName: 'Sequence',
      field: 'sequence.code',
      rowSpan: rowSpan,
      cellClass: 'cell',
    },
    {
      headerName: 'Description',
      field: 'description',
      rowSpan: rowSpan,
      cellClass: 'cell',
    },
    {
      headerName: 'ANIM',
      children: [
        {
          headerName: 'Status',
          field: 'tasks',
          cellRenderer: (params) => {
            const taskStatuses = params.value.map((task) => task.status);
            return taskStatuses.join('<br>');
          },
          columnGroupShow: 'open',
        },
        {
          headerName: 'Task Name',
          field: 'tasks',
          cellRenderer: (params) => {
            const taskNames = params.value.map((task) => task.content);
            return taskNames.join('<br>');
          },
          columnGroupShow: 'open',
        },
      ],
    },
  ];

  public defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    autoHeight: true,
    wrapText: true,
  };
  public rowData!: Shot[];

  constructor(private http: HttpClient) {}

  onGridReady(params: GridReadyEvent<Shot>) {
    this.rowData = [
      {
        code: 'sc01_0001',
        sequence: {
          code: 'sc01',
        },
        description: 'Something...',
        tasks: [
          {
            content: 'layout',
            status: 'wtg',
          },
          {
            content: 'animation',
            status: 'ip',
          },
          {
            content: 'lighting',
            status: 'wtg',
          },
          {
            content: 'compose',
            status: 'wtg',
          },
        ],
      },
      {
        code: 'sc01_0002',
        sequence: {
          code: 'sc02',
        },
        description: 'Something...',
        tasks: [
          {
            content: 'layout',
            status: 'wtg',
          },
          {
            content: 'animation',
            status: 'ip',
          },
        ],
      },
      {
        code: 'sc01_0003',
        sequence: {
          code: 'sc03',
        },
        description: 'Something...',
        tasks: [
          {
            content: 'layout',
            status: 'wtg',
          },
          {
            content: 'animation',
            status: 'ip',
          },
          {
            content: 'lighting',
            status: 'wtg',
          },
          {
            content: 'compose',
            status: 'wtg',
          },
          {
            content: 't_pose',
            status: 'cmpl',
          },
        ],
      },
    ];
  }
}

function rowSpan(params: RowSpanParams<Shot>) {
  return params.data.tasks.length > 0 ? params.data.tasks.length : 1;
}

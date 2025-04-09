// data-grid.component.ts
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DetailDialogComponent } from './detail-dialog.component';
import { GridOptions } from 'ag-grid-community';

@Component({
  selector: 'app-data-grid',
  template: `
    <div style="height: 600px; width: 100%;">
      <ag-grid-angular
        style="width: 100%; height: 100%;"
        class="ag-theme-material"
        [gridOptions]="gridOptions"
        [rowData]="rowData"
        (gridReady)="onGridReady($event)">
      </ag-grid-angular>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: ",
      height: 100%;
    }
  `]
})
export class DataGridComponent implements OnInit {
  gridOptions: GridOptions;
  rowData: any[] = [];

  constructor(private dialog: MatDialog) {
    this.gridOptions = {
      masterDetail: true,
      detailCellRendererParams: {
        detailGridOptions: {
          columnDefs: [
            { field: 'id', headerName: 'ID' },
            { field: 'description', headerName: 'Description' },
            { field: 'value', headerName: 'Value' }
          ],
          onRowClicked: (params) => this.onDetailRowClicked(params)
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

  ngOnInit() {
    // Sample master data
    this.rowData = [
      { id: 1, name: 'Item 1', status: 'Active' },
      { id: 2, name: 'Item 2', status: 'Inactive' },
      { id: 3, name: 'Item 3', status: 'Active' }
    ];
  }

  onGridReady(params: any) {
    params.api.sizeColumnsToFit();
  }

  getDetailData(masterRow: any) {
    // Sample detail data
    return [
      { id: `${masterRow.id}-1`, description: `Detail for ${masterRow.name}`, value: 100 },
      { id: `${masterRow.id}-2`, description: `Another detail`, value: 200 }
    ];
  }

  onDetailRowClicked(params: any) {
    this.dialog.open(DetailDialogComponent, {
      width: '400px',
      data: {
        message: `Selected detail row: ${params.data.description} with value ${params.data.value}`
      }
    });
  }
}

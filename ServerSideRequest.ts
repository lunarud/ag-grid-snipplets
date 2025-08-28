import { Component, OnInit } from '@angular/core';
import { ColDef, GridApi, GridReadyEvent, IServerSideDatasource, IServerSideGetRowsParams } from 'ag-grid-community';
import { HttpClient } from '@angular/common/http';

interface ServerSideRequest {
  startRow: number;
  endRow: number;
  sortModel: any[];
  filterModel: any;
  groupKeys: string[];
}

interface ServerSideResponse {
  data: any[];
  totalRows: number;
}

@Component({
  selector: 'app-data-grid',
  template: `
    <div class="grid-container">
      <ag-grid-angular
        style="width: 100%; height: 600px;"
        class="ag-theme-alpine"
        [columnDefs]="columnDefs"
        [rowModelType]="'serverSide'"
        [cacheBlockSize]="100"
        [maxBlocksInCache]="10"
        [serverSideInfiniteScroll]="true"
        [suppressColumnVirtualisation]="false"
        [animateRows]="true"
        [enableRangeSelection]="true"
        [enableCharts]="true"
        (gridReady)="onGridReady($event)">
      </ag-grid-angular>
      
      <div class="grid-info" *ngIf="gridApi">
        <p>Total Rows: {{ totalRows }}</p>
        <p>Displayed Rows: {{ displayedRows }}</p>
      </div>
    </div>
  `,
  styles: [`
    .grid-container {
      padding: 20px;
    }
    .grid-info {
      margin-top: 10px;
      padding: 10px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
    .grid-info p {
      margin: 5px 0;
      font-size: 14px;
    }
  `]
})
export class DataGridComponent implements OnInit {
  private gridApi!: GridApi;
  public totalRows = 0;
  public displayedRows = 0;
  
  // Define column definitions
  public columnDefs: ColDef[] = [
    {
      headerName: 'ID',
      field: 'id',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 100,
      pinned: 'left'
    },
    {
      headerName: 'Name',
      field: 'name',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 200,
      cellRenderer: (params: any) => {
        return `<strong>${params.value}</strong>`;
      }
    },
    {
      headerName: 'Email',
      field: 'email',
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 250
    },
    {
      headerName: 'Department',
      field: 'department',
      sortable: true,
      filter: 'agSetColumnFilter',
      width: 150
    },
    {
      headerName: 'Salary',
      field: 'salary',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 130,
      cellRenderer: (params: any) => {
        return params.value ? `$${params.value.toLocaleString()}` : '';
      }
    },
    {
      headerName: 'Join Date',
      field: 'joinDate',
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 150,
      cellRenderer: (params: any) => {
        return params.value ? new Date(params.value).toLocaleDateString() : '';
      }
    },
    {
      headerName: 'Active',
      field: 'isActive',
      sortable: true,
      filter: 'agSetColumnFilter',
      width: 100,
      cellRenderer: (params: any) => {
        return params.value ? '✅' : '❌';
      }
    }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Component initialization
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    
    // Create server-side datasource
    const datasource: IServerSideDatasource = {
      getRows: (params: IServerSideGetRowsParams) => {
        console.log('Server-side request:', params.request);
        
        // Build request object for C# backend
        const serverRequest: ServerSideRequest = {
          startRow: params.request.startRow || 0,
          endRow: params.request.endRow || 100,
          sortModel: params.request.sortModel || [],
          filterModel: params.request.filterModel || {},
          groupKeys: params.request.groupKeys || []
        };

        // Make HTTP request to C# backend
        this.http.post<ServerSideResponse>('/api/employees/serverside', serverRequest)
          .subscribe({
            next: (response) => {
              console.log('Server response:', response);
              
              this.totalRows = response.totalRows;
              this.displayedRows = response.data.length;
              
              // Provide data to ag-Grid
              params.success({
                rowData: response.data,
                rowCount: response.totalRows
              });
            },
            error: (error) => {
              console.error('Server-side request failed:', error);
              params.fail();
            }
          });
      }
    };

    // Set the server-side datasource
    params.api.setServerSideDatasource(datasource);
  }

  // Helper methods for grid operations
  public refreshGrid(): void {
    if (this.gridApi) {
      this.gridApi.refreshServerSide({ purge: true });
    }
  }

  public exportToCsv(): void {
    if (this.gridApi) {
      this.gridApi.exportDataAsCsv({
        fileName: 'employee-data.csv'
      });
    }
  }

  public clearFilters(): void {
    if (this.gridApi) {
      this.gridApi.setFilterModel(null);
    }
  }

  public clearSorts(): void {
    if (this.gridApi) {
      this.gridApi.setSortModel(null);
    }
  }
}

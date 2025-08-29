import { Component, OnInit, ViewChild, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular } from 'ag-grid-angular';
import { GridOptions, IServerSideDatasource, IServerSideGetRowsRequest } from 'ag-grid-community';
import 'ag-grid-enterprise';

interface GridConfig {
  id: string;
  title: string;
  columnDefs: any[];
  datasourceUrl: string;
  gridOptions?: GridOptions;
  isExpanded?: boolean;
  isConfigured?: boolean;
}

@Component({
  selector: 'app-multi-grid',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatButtonModule, AgGridAngular],
  template: `
    <div class="container">
      <h2>Multiple AG-Grid with SSRM</h2>
      
      <mat-accordion multi="true">
        <mat-expansion-panel 
          *ngFor="let config of gridConfigs; trackBy: trackByGridId"
          [(expanded)]="config.isExpanded"
          (opened)="onPanelOpened(config)"
          (closed)="onPanelClosed(config)">
          
          <mat-expansion-panel-header>
            <mat-panel-title>{{ config.title }}</mat-panel-title>
            <mat-panel-description>
              {{ config.isConfigured ? 'Configured' : 'Not configured' }}
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="grid-container" *ngIf="config.isExpanded">
            <ag-grid-angular
              #agGrid
              class="ag-theme-alpine"
              style="height: 400px; width: 100%;"
              [gridOptions]="config.gridOptions"
              [columnDefs]="config.columnDefs"
              [rowModelType]="'serverSide'"
              [suppressRowClickSelection]="true"
              [animateRows]="true"
              [pagination]="true"
              [paginationPageSize]="100"
              [cacheBlockSize]="100"
              [maxBlocksInCache]="10"
              (gridReady)="onGridReady($event, config)">
            </ag-grid-angular>
          </div>
        </mat-expansion-panel>
      </mat-accordion>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .grid-container {
      margin-top: 16px;
    }

    mat-expansion-panel {
      margin-bottom: 8px;
    }

    .ag-theme-alpine {
      border: 1px solid #ddd;
      border-radius: 4px;
    }
  `]
})
export class MultiGridComponent implements OnInit {
  @ViewChildren('agGrid') agGrids!: QueryList<AgGridAngular>;

  gridConfigs: GridConfig[] = [
    {
      id: 'users-grid',
      title: 'Users Data',
      datasourceUrl: '/api/users',
      columnDefs: [
        { field: 'id', headerName: 'ID', width: 80, sortable: true, filter: true },
        { field: 'name', headerName: 'Name', width: 150, sortable: true, filter: 'agTextColumnFilter' },
        { field: 'email', headerName: 'Email', width: 200, sortable: true, filter: 'agTextColumnFilter' },
        { field: 'department', headerName: 'Department', width: 130, sortable: true, filter: 'agSetColumnFilter' },
        { field: 'role', headerName: 'Role', width: 120, sortable: true, filter: 'agSetColumnFilter' },
        { field: 'salary', headerName: 'Salary', width: 100, sortable: true, filter: 'agNumberColumnFilter', valueFormatter: this.currencyFormatter }
      ],
      isExpanded: false,
      isConfigured: false
    },
    {
      id: 'orders-grid',
      title: 'Orders Data',
      datasourceUrl: '/api/orders',
      columnDefs: [
        { field: 'orderId', headerName: 'Order ID', width: 100, sortable: true, filter: true },
        { field: 'customerName', headerName: 'Customer', width: 150, sortable: true, filter: 'agTextColumnFilter' },
        { field: 'product', headerName: 'Product', width: 200, sortable: true, filter: 'agTextColumnFilter' },
        { field: 'quantity', headerName: 'Quantity', width: 100, sortable: true, filter: 'agNumberColumnFilter' },
        { field: 'price', headerName: 'Price', width: 100, sortable: true, filter: 'agNumberColumnFilter', valueFormatter: this.currencyFormatter },
        { field: 'status', headerName: 'Status', width: 120, sortable: true, filter: 'agSetColumnFilter' },
        { field: 'orderDate', headerName: 'Order Date', width: 130, sortable: true, filter: 'agDateColumnFilter' }
      ],
      isExpanded: false,
      isConfigured: false
    },
    {
      id: 'products-grid',
      title: 'Products Data',
      datasourceUrl: '/api/products',
      columnDefs: [
        { field: 'productId', headerName: 'Product ID', width: 100, sortable: true, filter: true },
        { field: 'name', headerName: 'Product Name', width: 200, sortable: true, filter: 'agTextColumnFilter' },
        { field: 'category', headerName: 'Category', width: 130, sortable: true, filter: 'agSetColumnFilter' },
        { field: 'price', headerName: 'Price', width: 100, sortable: true, filter: 'agNumberColumnFilter', valueFormatter: this.currencyFormatter },
        { field: 'stock', headerName: 'Stock', width: 100, sortable: true, filter: 'agNumberColumnFilter' },
        { field: 'supplier', headerName: 'Supplier', width: 150, sortable: true, filter: 'agTextColumnFilter' },
        { field: 'description', headerName: 'Description', width: 250, sortable: true, filter: 'agTextColumnFilter' }
      ],
      isExpanded: false,
      isConfigured: false
    }
  ];

  ngOnInit(): void {
    this.initializeGridOptions();
  }

  trackByGridId(index: number, config: GridConfig): string {
    return config.id;
  }

  private initializeGridOptions(): void {
    this.gridConfigs.forEach(config => {
      config.gridOptions = {
        defaultColDef: {
          flex: 1,
          minWidth: 100,
          resizable: true,
          sortable: true,
          filter: true,
          floatingFilter: true
        },
        rowSelection: 'multiple',
        enableRangeSelection: true,
        enableCharts: true,
        sideBar: {
          toolPanels: [
            {
              id: 'columns',
              labelDefault: 'Columns',
              labelKey: 'columns',
              iconKey: 'columns',
              toolPanel: 'agColumnsToolPanel'
            },
            {
              id: 'filters',
              labelDefault: 'Filters',
              labelKey: 'filters',
              iconKey: 'filter',
              toolPanel: 'agFiltersToolPanel'
            }
          ]
        },
        statusBar: {
          statusPanels: [
            { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
            { statusPanel: 'agSelectedRowCountComponent', align: 'center' },
            { statusPanel: 'agAggregationComponent', align: 'right' }
          ]
        }
      };
    });
  }

  onPanelOpened(config: GridConfig): void {
    console.log(`Panel opened: ${config.title}`);
    config.isExpanded = true;
    
    // Trigger grid configuration when panel opens
    if (!config.isConfigured) {
      setTimeout(() => {
        this.configureGrid(config);
      }, 100); // Small delay to ensure DOM is ready
    }
  }

  onPanelClosed(config: GridConfig): void {
    console.log(`Panel closed: ${config.title}`);
    config.isExpanded = false;
  }

  onGridReady(event: any, config: GridConfig): void {
    console.log(`Grid ready: ${config.title}`);
    if (!config.isConfigured) {
      this.configureGrid(config);
    }
  }

  private configureGrid(config: GridConfig): void {
    if (config.isConfigured) return;

    console.log(`Configuring grid: ${config.title}`);
    
    // Find the specific AG-Grid instance for this config
    const agGridComponent = this.findAgGridComponent(config);
    
    if (agGridComponent && agGridComponent.api) {
      // Create server-side datasource
      const datasource = this.createServerSideDatasource(config);
      
      // Set the datasource
      agGridComponent.api.setServerSideDatasource(datasource);
      
      config.isConfigured = true;
      console.log(`Grid configured successfully: ${config.title}`);
    }
  }

  private findAgGridComponent(config: GridConfig): AgGridAngular | undefined {
    // This is a simplified approach. In a more complex scenario,
    // you might want to use ViewChild with template reference variables
    // or implement a more sophisticated grid tracking mechanism
    return this.agGrids.find((grid, index) => {
      const configIndex = this.gridConfigs.findIndex(c => c.id === config.id);
      return index === configIndex;
    });
  }

  private createServerSideDatasource(config: GridConfig): IServerSideDatasource {
    return {
      getRows: (params: IServerSideGetRowsRequest) => {
        console.log(`Loading data for ${config.title}:`, params);
        
        // Simulate server-side data loading
        this.loadServerSideData(config, params)
          .then(result => {
            console.log(`Data loaded for ${config.title}:`, result);
            params.success({
              rowData: result.data,
              rowCount: result.totalCount
            });
          })
          .catch(error => {
            console.error(`Error loading data for ${config.title}:`, error);
            params.fail();
          });
      }
    };
  }

  private async loadServerSideData(config: GridConfig, params: IServerSideGetRowsRequest): Promise<{ data: any[], totalCount: number }> {
    // Extract request parameters
    const startRow = params.request.startRow || 0;
    const endRow = params.request.endRow || 100;
    const pageSize = endRow - startRow;
    
    const sortModel = params.request.sortModel;
    const filterModel = params.request.filterModel;
    
    // Build query parameters
    const queryParams = new URLSearchParams({
      startRow: startRow.toString(),
      endRow: endRow.toString(),
      pageSize: pageSize.toString()
    });
    
    if (sortModel && sortModel.length > 0) {
      queryParams.append('sortBy', sortModel[0].colId);
      queryParams.append('sortDirection', sortModel[0].sort);
    }
    
    if (filterModel && Object.keys(filterModel).length > 0) {
      queryParams.append('filters', JSON.stringify(filterModel));
    }
    
    // In a real application, make HTTP request to your server
    // For demo purposes, return mock data
    return this.getMockData(config, startRow, pageSize, sortModel, filterModel);
  }

  private async getMockData(
    config: GridConfig, 
    startRow: number, 
    pageSize: number, 
    sortModel: any[], 
    filterModel: any
  ): Promise<{ data: any[], totalCount: number }> {
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let mockData: any[] = [];
    const totalCount = 1000; // Total records available
    
    // Generate mock data based on grid type
    switch (config.id) {
      case 'users-grid':
        mockData = this.generateUsersData(startRow, pageSize);
        break;
      case 'orders-grid':
        mockData = this.generateOrdersData(startRow, pageSize);
        break;
      case 'products-grid':
        mockData = this.generateProductsData(startRow, pageSize);
        break;
    }
    
    // Apply basic sorting (in real app, this would be done server-side)
    if (sortModel && sortModel.length > 0) {
      const sortField = sortModel[0].colId;
      const sortDirection = sortModel[0].sort;
      
      mockData.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (sortDirection === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }
    
    return {
      data: mockData,
      totalCount: totalCount
    };
  }

  private generateUsersData(startRow: number, pageSize: number): any[] {
    const data = [];
    const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'];
    const roles = ['Manager', 'Senior', 'Junior', 'Lead', 'Director'];
    
    for (let i = 0; i < pageSize; i++) {
      const id = startRow + i + 1;
      data.push({
        id: id,
        name: `User ${id}`,
        email: `user${id}@company.com`,
        department: departments[id % departments.length],
        role: roles[id % roles.length],
        salary: Math.floor(Math.random() * 100000) + 40000
      });
    }
    return data;
  }

  private generateOrdersData(startRow: number, pageSize: number): any[] {
    const data = [];
    const products = ['Laptop', 'Phone', 'Tablet', 'Monitor', 'Keyboard', 'Mouse'];
    const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    
    for (let i = 0; i < pageSize; i++) {
      const id = startRow + i + 1;
      data.push({
        orderId: `ORD-${id.toString().padStart(5, '0')}`,
        customerName: `Customer ${id}`,
        product: products[id % products.length],
        quantity: Math.floor(Math.random() * 10) + 1,
        price: Math.floor(Math.random() * 1000) + 100,
        status: statuses[id % statuses.length],
        orderDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0]
      });
    }
    return data;
  }

  private generateProductsData(startRow: number, pageSize: number): any[] {
    const data = [];
    const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
    const suppliers = ['Supplier A', 'Supplier B', 'Supplier C', 'Supplier D'];
    
    for (let i = 0; i < pageSize; i++) {
      const id = startRow + i + 1;
      data.push({
        productId: `PROD-${id.toString().padStart(5, '0')}`,
        name: `Product ${id}`,
        category: categories[id % categories.length],
        price: Math.floor(Math.random() * 500) + 10,
        stock: Math.floor(Math.random() * 100),
        supplier: suppliers[id % suppliers.length],
        description: `Description for product ${id}`
      });
    }
    return data;
  }

  private currencyFormatter(params: any): string {
    if (params.value == null) return '';
    return '$' + params.value.toLocaleString();
  }
}

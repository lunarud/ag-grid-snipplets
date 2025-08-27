// tree-data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface FlatTreeNode {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  createdDate: Date;
  isActive: boolean;
  nodeType: string;
  orgHierarchy: string[];
  fullPath: string;
  hasChildren: boolean;
  childCount: number;
  displayName: string;
  indentedName: string;
}

export interface TreeNode {
  id?: string;
  name: string;
  description: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  createdDate?: Date;
  isActive: boolean;
  nodeType: string;
  metadata?: { [key: string]: any };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class TreeDataService {
  private readonly baseUrl = 'https://localhost:5001/api/treedata'; // Update with your API URL

  constructor(private http: HttpClient) {}

  /**
   * Get all flattened tree data for ag-Grid
   */
  getFlattenedTreeData(): Observable<FlatTreeNode[]> {
    return this.http.get<ApiResponse<FlatTreeNode[]>>(`${this.baseUrl}/flat`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Get flattened tree data by parent ID
   */
  getFlattenedTreeDataByParent(parentId: string): Observable<FlatTreeNode[]> {
    return this.http.get<ApiResponse<FlatTreeNode[]>>(`${this.baseUrl}/flat/parent/${parentId}`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Get root nodes only
   */
  getRootNodes(): Observable<FlatTreeNode[]> {
    return this.http.get<ApiResponse<FlatTreeNode[]>>(`${this.baseUrl}/flat/roots`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Create a new tree node
   */
  createNode(node: TreeNode): Observable<TreeNode> {
    return this.http.post<ApiResponse<TreeNode>>(this.baseUrl, node)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Update an existing tree node
   */
  updateNode(id: string, node: TreeNode): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}`, node)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Delete a tree node
   */
  deleteNode(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Transform data for ag-Grid tree data format
   * This method can be used if you need additional client-side transformations
   */
  transformForAgGrid(nodes: FlatTreeNode[]): FlatTreeNode[] {
    return nodes.map(node => ({
      ...node,
      // Ensure orgHierarchy is properly formatted for ag-Grid
      orgHierarchy: node.orgHierarchy || [node.id]
    }));
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server Error: ${error.status} - ${error.message}`;
      if (error.error?.message) {
        errorMessage += ` - ${error.error.message}`;
      }
    }
    
    console.error('TreeDataService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}

// tree-grid.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GridApi, ColumnApi } from 'ag-grid-community';
import { TreeDataService, FlatTreeNode } from './tree-data.service';

@Component({
  selector: 'app-tree-grid',
  template: `
    <div class="tree-grid-container">
      <div class="grid-header">
        <h2>Hierarchical Tree Data</h2>
        <div class="grid-controls">
          <button class="btn btn-primary" (click)="expandAll()">Expand All</button>
          <button class="btn btn-secondary" (click)="collapseAll()">Collapse All</button>
          <button class="btn btn-success" (click)="refreshData()">Refresh</button>
        </div>
      </div>
      
      <ag-grid-angular
        #agGrid
        class="ag-theme-alpine tree-grid"
        [columnDefs]="columnDefs"
        [rowData]="rowData"
        [treeData]="true"
        [getDataPath]="getDataPath"
        [autoGroupColumnDef]="autoGroupColumnDef"
        [groupDefaultExpanded]="groupDefaultExpanded"
        [animateRows]="true"
        [enableRangeSelection]="true"
        [rowSelection]="'single'"
        (gridReady)="onGridReady($event)"
        style="height: 600px; width: 100%;">
      </ag-grid-angular>
    </div>
  `,
  styleUrls: ['./tree-grid.component.scss']
})
export class TreeGridComponent implements OnInit {
  @ViewChild('agGrid') agGrid!: AgGridAngular;
  
  private gridApi!: GridApi;
  private columnApi!: ColumnApi;

  columnDefs: ColDef[] = [
    { 
      field: 'name', 
      headerName: 'Name',
      sortable: true,
      filter: true,
      resizable: true
    },
    { 
      field: 'description', 
      headerName: 'Description',
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1
    },
    { 
      field: 'nodeType', 
      headerName: 'Type',
      sortable: true,
      filter: true,
      width: 120
    },
    { 
      field: 'level', 
      headerName: 'Level',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 100
    },
    {
      field: 'childCount',
      headerName: 'Children',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 110
    },
    { 
      field: 'createdDate', 
      headerName: 'Created',
      sortable: true,
      filter: 'agDateColumnFilter',
      width: 120,
      valueFormatter: (params) => {
        if (params.value) {
          return new Date(params.value).toLocaleDateString();
        }
        return '';
      }
    },
    {
      field: 'fullPath',
      headerName: 'Full Path',
      sortable: false,
      filter: true,
      width: 300,
      tooltipField: 'fullPath'
    }
  ];

  autoGroupColumnDef: ColDef = {
    headerName: 'Hierarchy',
    width: 300,
    cellRendererParams: {
      suppressCount: true,
      innerRenderer: (params: any) => {
        return params.data ? params.data.name : '';
      }
    },
    sortable: true,
    filter: true
  };

  groupDefaultExpanded = 1; // Expand first level by default
  rowData: FlatTreeNode[] = [];

  constructor(private treeDataService: TreeDataService) {}

  ngOnInit(): void {
    this.loadTreeData();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.columnApi = params.columnApi;
    
    // Auto-size columns to fit content
    this.columnApi.autoSizeAllColumns();
  }

  getDataPath = (data: FlatTreeNode): string[] => {
    return data.orgHierarchy;
  };

  loadTreeData(): void {
    this.treeDataService.getFlattenedTreeData().subscribe({
      next: (data) => {
        this.rowData = this.treeDataService.transformForAgGrid(data);
        console.log('Loaded tree data:', data.length, 'nodes');
      },
      error: (error) => {
        console.error('Error loading tree data:', error);
        // Handle error (show toast, etc.)
      }
    });
  }

  expandAll(): void {
    if (this.gridApi) {
      this.gridApi.expandAll();
    }
  }

  collapseAll(): void {
    if (this.gridApi) {
      this.gridApi.collapseAll();
    }
  }

  refreshData(): void {
    this.loadTreeData();
  }
}

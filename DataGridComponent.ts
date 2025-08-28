// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AgGridModule } from 'ag-grid-angular';

import { AppComponent } from './app.component';
import { DataGridComponent } from './components/data-grid.component';

@NgModule({
  declarations: [
    AppComponent,
    DataGridComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AgGridModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

// app.component.html
/*
<div class="app-container">
  <h1>Employee Data Grid - Server Side Row Model</h1>
  <app-data-grid></app-data-grid>
</div>
*/

// app.component.css
/*
.app-container {
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}
*/

// Installation and Setup Instructions

/*
INSTALLATION STEPS:

1. Install required npm packages:
   npm install ag-grid-community ag-grid-angular

2. Install ag-Grid theme CSS (add to angular.json):
   "styles": [
     "node_modules/ag-grid-community/styles/ag-grid.css",
     "node_modules/ag-grid-community/styles/ag-theme-alpine.css",
     "src/styles.css"
   ]

3. If using ag-Grid Enterprise features, install:
   npm install ag-grid-enterprise
   
   Then import in your main module:
   import 'ag-grid-enterprise';

4. Backend Setup:
   - Ensure your C# Web API project has the necessary packages:
     - Microsoft.AspNetCore.Mvc
     - Microsoft.Extensions.Configuration
     - System.Data (for DataTable)
   
   - Configure connection string in appsettings.json:
     {
       "ConnectionStrings": {
         "DefaultConnection": "Your connection string here"
       }
     }

5. CORS Configuration:
   Make sure CORS is properly configured in your C# backend to allow 
   requests from your Angular development server (typically http://localhost:4200)

ADVANCED FEATURES YOU CAN ADD:

1. Custom Cell Renderers:
   - Add action buttons (edit, delete, view)
   - Status indicators
   - Progress bars
   - Images/avatars

2. Advanced Filtering:
   - Date range filters
   - Multi-select filters
   - Custom filter components

3. Grouping and Aggregation:
   - Group by department, status, etc.
   - Sum, average, count aggregations

4. Export Features:
   - Excel export
   - PDF export
   - Custom export formats

5. Real-time Updates:
   - SignalR integration
   - WebSocket connections
   - Automatic refresh

6. Performance Optimizations:
   - Caching strategies
   - Database indexing
   - Lazy loading

CONFIGURATION OPTIONS:

Row Model Settings:
- cacheBlockSize: Number of rows to fetch per request (default: 100)
- maxBlocksInCache: Maximum blocks to keep in memory (default: 10)
- serverSideInfiniteScroll: Enable infinite scrolling (default: false)

Grid Features:
- enableRangeSelection: Allow cell range selection
- enableCharts: Enable integrated charting
- animateRows: Animate row changes
- suppressColumnVirtualisation: Show all columns (performance impact)

Performance Tips:
1. Use appropriate block sizes (100-1000 rows)
2. Implement proper indexing on sorted/filtered columns
3. Use pagination for very large datasets
4. Consider using database views for complex queries
5. Implement caching at the service level

TROUBLESHOOTING:

Common Issues:
1. CORS errors: Check backend CORS configuration
2. Data not loading: Verify API endpoint and request format
3. Sorting/filtering not working: Check backend implementation
4. Performance issues: Adjust block size and caching settings
*/

// Enhanced data grid service for more advanced scenarios
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataGridService {
  private readonly baseUrl = '/api/employees';
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  getServerSideData(request: any): Observable<any> {
    this.loadingSubject.next(true);
    
    return this.http.post<any>(`${this.baseUrl}/serverside`, request)
      .pipe(
        map(response => {
          this.loadingSubject.next(false);
          return response;
        }),
        catchError(error => {
          this.loadingSubject.next(false);
          throw error;
        })
      );
  }

  exportData(filters: any, sortModel: any): Observable<Blob> {
    const params = new HttpParams()
      .set('filters', JSON.stringify(filters))
      .set('sortModel', JSON.stringify(sortModel));

    return this.http.get(`${this.baseUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }

  getDepartments(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/departments`);
  }

  getColumnStatistics(columnName: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/statistics/${columnName}`);
  }
}

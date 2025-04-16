import { Component, OnInit } from '@angular/core';
import { ColDef, GridOptions } from 'ag-grid-community';
import { EmployeeService } from './employee.service';
import { EmployeeViewModel } from './employee-view-model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'ag-grid-master-detail-example';

  columnDefs: ColDef[] = [
    { headerName: 'ID', field: 'id', sortable: true, filter: true },
    { headerName: 'Full Name', field: 'fullName', sortable: true, filter: true },
    { headerName: 'Department', field: 'department', sortable: true, filter: true },
    { headerName: 'Salary', field: 'salaryFormatted', sortable: true, filter: true },
    { headerName: 'Hire Date', field: 'hireDateFormatted', sortable: true, filter: true }
  ];

  detailColumnDefs: ColDef[] = [
    { headerName: 'Team Member ID', field: 'id', sortable: true, filter: true },
    { headerName: 'First Name', field: 'firstName', sortable: true, filter: true },
    { headerName: 'Last Name', field: 'lastName', sortable: true, filter: true },
    { headerName: 'Role', field: 'role', sortable: true, filter: true },
    { headerName: 'Salary', field: 'salary', sortable: true, filter: true, valueFormatter: params => `$${params.value.toLocaleString()}` },
    { headerName: 'Hire Date', field: 'hireDate', sortable: true, filter: true, valueFormatter: params => new Date(params.value).toLocaleDateString() }
  ];

  rowData: EmployeeViewModel[] = [];

  gridOptions: GridOptions = {
    masterDetail: true,
    detailCellRendererParams: {
      detailGridOptions: {
        columnDefs: this.detailColumnDefs,
        defaultColDef: {
          flex: 1
        }
      },
      getDetailRowData: params => {
        params.successCallback(params.data.teamMembers || []);
      }
    },
    defaultColDef: {
      flex: 1,
      sortable: true,
      filter: true
    }
  };

  constructor(private employeeService: EmployeeService) { }

  ngOnInit() {
    this.employeeService.getEmployees().subscribe(
      data => {
        // Add static teamMembers to each EmployeeViewModel
        this.rowData = data.map(employee => ({
          ...employee,
          teamMembers: [
            { id: 101, firstName: 'Alice', lastName: 'Brown', role: 'Developer', salary: 60000, hireDate: new Date(2021, 0, 10) },
            { id: 102, firstName: 'Bob', lastName: 'Green', role: 'Tester', salary: 55000, hireDate: new Date(2021, 5, 15) }
          ]
        }));
      },
      error => {
        console.error('Error fetching employees:', error);
      }
    );
  }
}

import { Component } from '@angular/core';

@Component({
  selector: 'app-my-grid',
  template: `
    <ag-grid-angular
      style="width: 100%; height: 500px;"
      class="ag-theme-alpine"
      [rowData]="rowData"
      [columnDefs]="columnDefs"
      rowSelection="multiple"
      [rowMultiSelectWithClick]="true"
      (selectionChanged)="onSelectionChanged($event)">
    </ag-grid-angular>
  `,
})
export class MyGridComponent {
  columnDefs = [
    { headerName: 'Select', checkboxSelection: true, width: 50 },
    { headerName: 'Make', field: 'make' },
    { headerName: 'Model', field: 'model' },
    { headerName: 'Price', field: 'price' },
  ];

  rowData = [
    { make: 'Toyota', model: 'Celica', price: 35000 },
    { make: 'Ford', model: 'Mondeo', price: 32000 },
    { make: 'Porsche', model: 'Boxster', price: 72000 },
  ];

  onSelectionChanged(event: any) {
    const selectedNodes = event.api.getSelectedNodes();
    const selectedData = selectedNodes.map(node => node.data);
    console.log('Selected data:', selectedData);
  }
}
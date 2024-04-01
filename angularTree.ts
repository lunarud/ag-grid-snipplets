<table mat-table [dataSource]="dataSource" class="mat-elevation-z8">
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef> 
      <span [style.paddingLeft.px]="40"> Name </span>
    </th>
    <td mat-cell *matCellDef="let data"> 
      <button mat-icon-button 
              [style.visibility]="!data.expandable ? 'hidden' : ''"
              [style.marginLeft.px]="data.level * 32"
              (click)="treeControl.toggle(data)">
        <mat-icon class="mat-icon-rtl-mirror">
          {{treeControl.isExpanded(data) ? 'expand_more' : 'chevron_right'}}
        </mat-icon>
      </button>

      {{data.name}}
    </td>
  </ng-container> 

  <ng-container matColumnDef="count">
    <th mat-header-cell *matHeaderCellDef> Count </th>
    <td mat-cell *matCellDef="let data"> {{data.count}} </td>
  </ng-container> 

  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
</table>



<!-- Copyright 2018 Google Inc. All Rights Reserved.
    Use of this source code is governed by an MIT-style license that
    can be found in the LICENSE file at http://angular.io/license -->

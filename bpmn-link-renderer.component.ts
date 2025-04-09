// bpmn-link-renderer.component.ts
import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { MatDialog } from '@angular/material/dialog';
import { BpmnViewerDialogComponent } from './bpmn-viewer-dialog.component';
import { CamundaService } from './camunda.service';

@Component({
  selector: 'app-bpmn-link-renderer',
  template: `
    <span class="view-container">
      <mat-icon class="view-icon">visibility</mat-icon>
      <a href="javascript:void(0)" 
         (click)="openBpmnViewer()"
         class="view-link">
        View Workflow
      </a>
    </span>
  `,
  styles: [`
    .view-container {
      display: flex;
      align-items: center;
      height: 100%;
    }
    .view-icon {
      margin-right: 8px;
      font-size: 18px;
      height: 18px;
      width: 18px;
      color: #666;
    }
    .view-link {
      color: #0277bd;
      text-decoration: none;
      cursor: pointer;
    }
    .view-link:hover {
      text-decoration: underline;
      color: #01579b;
    }
  `]
})
export class BpmnLinkRendererComponent implements ICellRendererAngularComp {
  private params: ICellRendererParams | undefined;

  constructor(
    private dialog: MatDialog,
    private camundaService: CamundaService
  ) {}

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    return true;
  }

  openBpmnViewer(): void {
    if (this.params?.data) {
      // For this example, we'll assume the master row has a processDefinitionId
      // You might need to adjust this based on your actual data structure
      const processDefinitionId = this.params.context?.masterData?.processDefinitionId || 
        'your-process-definition-id'; // Replace with actual ID or get from data

      this.camundaService.getProcessDefinitionXml(processDefinitionId)
        .subscribe({
          next: (response) => {
            const xml = response.bpmn20Xml;
            this.dialog.open(BpmnViewerDialogComponent, {
              width: '800px',
              data: { xml }
            });
          },
          error: (err) => {
            console.error('Error fetching BPMN XML:', err);
          }
        });
    }
  }
}

// bpmn-viewer-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import * as BpmnJS from 'bpmn-js';

@Component({
  selector: 'app-bpmn-viewer-dialog',
  template: `
    <h2 mat-dialog-title>Workflow Viewer</h2>
    <mat-dialog-content>
      <div id="bpmn-container" style="height: 500px; width: 100%;"></div>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onClose()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    #bpmn-container {
      border: 1px solid #ccc;
    }
  `]
})
export class BpmnViewerDialogComponent implements OnInit {
  private viewer: any;

  constructor(
    public dialogRef: MatDialogRef<BpmnViewerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { xml: string }
  ) {}

  ngOnInit() {
    this.viewer = new BpmnJS({
      container: '#bpmn-container'
    });
    this.renderDiagram();
  }

  async renderDiagram() {
    try {
      if (this.data.xml) {
        await this.viewer.importXML(this.data.xml);
        const canvas = this.viewer.get('canvas');
        canvas.zoom('fit-viewport');
      }
    } catch (err) {
      console.error('Error rendering BPMN diagram:', err);
    }
  }

  onClose(): void {
    this.dialogRef.close();
    this.viewer.destroy();
  }
}

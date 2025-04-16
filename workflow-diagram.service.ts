// workflow-diagram.service.ts
import { Injectable } from '@angular/core';
import * as joint from 'jointjs';
import { WorkflowDiagram } from './workflow-diagram.model';

@Injectable({
  providedIn: 'root'
})
export class WorkflowDiagramService {
  private graph: joint.dia.Graph;
  private paper: joint.dia.Paper;

  constructor() {
    this.graph = new joint.dia.Graph();
  }

  initializeDiagram(element: HTMLElement): void {
    this.paper = new joint.dia.Paper({
      el: element,
      model: this.graph,
      width: 800,
      height: 600,
      gridSize: 1,
      drawGrid: true
    });
  }

  parseAndRender(jsonData: WorkflowDiagram): void {
    this.graph.clear();

    // Create elements (tasks)
    const elements: { [key: string]: joint.shapes.standard.Rectangle } = {};

    jsonData.tasks.forEach(task => {
      const rect = new joint.shapes.standard.Rectangle({
        position: { x: task.position?.x || 100, y: task.position?.y || 100 },
        size: { width: 100, height: 60 },
        attrs: {
          body: {
            fill: '#E6F3FF',
            stroke: '#000000',
            rx: 5,
            ry: 5
          },
          label: {
            text: task.name,
            fill: '#000000'
          }
        }
      });
      rect.addTo(this.graph);
      elements[task.id] = rect;
    });

    // Create links (transitions)
    jsonData.transitions?.forEach(transition => {
      const link = new joint.shapes.standard.Link({
        source: { id: elements[transition.from].id },
        target: { id: elements[transition.to].id },
        attrs: {
          line: {
            stroke: '#333333',
            strokeWidth: 2
          }
        }
      });
      link.addTo(this.graph);
    });
  }
}

// workflow-diagram.model.ts
export interface WorkflowDiagram {
  tasks: Task[];
  transitions?: Transition[];
}

export interface Task {
  id: string;
  name: string;
  position?: {
    x: number;
    y: number;
  };
}

export interface Transition {
  from: string;
  to: string;
}

// workflow-diagram.component.ts
import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { WorkflowDiagramService } from './workflow-diagram.service';
import { WorkflowDiagram } from './workflow-diagram.model';

@Component({
  selector: 'app-workflow-diagram',
  template: `
    <div #diagramContainer style="border: 1px solid #ccc;"></div>
  `,
  styles: [`
    :host {
      display: block;
      width: 800px;
      height: 600px;
    }
  `]
})
export class WorkflowDiagramComponent implements AfterViewInit {
  @ViewChild('diagramContainer') diagramContainer!: ElementRef;

  // Example workflow data
  private workflowData: WorkflowDiagram = {
    tasks: [
      { id: '1', name: 'Start Task', position: { x: 100, y: 100 } },
      { id: '2', name: 'Process Task', position: { x: 300, y: 100 } },
      { id: '3', name: 'End Task', position: { x: 500, y: 100 } }
    ],
    transitions: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  };

  constructor(private workflowDiagramService: WorkflowDiagramService) {}

  ngAfterViewInit(): void {
    this.workflowDiagramService.initializeDiagram(this.diagramContainer.nativeElement);
    this.workflowDiagramService.parseAndRender(this.workflowData);
  }
}

// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { WorkflowDiagramComponent } from './workflow-diagram.component';

@NgModule({
  declarations: [
    WorkflowDiagramComponent
  ],
  imports: [
    BrowserModule
  ],
  bootstrap: [WorkflowDiagramComponent]
})
export class AppModule { }
```

To use this code, you'll need to:

1. Install required dependencies:
```bash
npm install jointjs @types/jointjs
```

2. Add JointJS CSS to your angular.json:
```json
"styles": [
  "node_modules/jointjs/dist/joint.min.css",
  "src/styles.css"
]
```

3. The code assumes a workflow JSON schema with:
   - tasks: Array of task objects with id, name, and optional position
   - transitions: Array of transition objects with from and to task IDs

4. The diagram features:
   - Rectangular task nodes with customizable positions
   - Directed links between tasks
   - Grid background
   - Basic styling for nodes and links
   - Automatic rendering of the workflow structure

To use different workflow data, modify the `workflowData` property in the component or inject it via an input. The service can be extended to handle additional features like:
- Interactive dragging of nodes
- Custom node types
- Validation of the workflow structure
- Event handling for node/link interactions

The diagram is rendered in an 800x600 container but can be adjusted via the paper configuration in the service.

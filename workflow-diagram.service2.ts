// workflow-diagram.service.ts
import { Injectable } from '@angular/core';
import * as joint from 'jointjs';
import { WorkflowDiagram, Task, Transition } from './workflow-diagram.model';

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
    const levels: { [key: string]: number } = {};
    const visited: Set<string> = new Set();

    // Calculate levels for vertical arrangement
    const calculateLevel = (taskId: string, level: number = 0): number => {
      if (visited.has(taskId)) {
        return levels[taskId] || 0;
      }
      visited.add(taskId);

      const taskTransitions = jsonData.transitions?.filter(t => t.from === taskId) || [];
      let maxChildLevel = level;

      for (const transition of taskTransitions) {
        const childLevel = calculateLevel(transition.to, level + 1);
        maxChildLevel = Math.max(maxChildLevel, childLevel);
      }

      levels[taskId] = maxChildLevel;
      return maxChildLevel;
    };

    // Calculate levels for all tasks
    jsonData.tasks.forEach(task => {
      if (!visited.has(task.id)) {
        calculateLevel(task.id);
      }
    });

    // Create elements with dynamic y-coordinates
    jsonData.tasks.forEach(task => {
      const level = levels[task.id] || 0;
      const rect = new joint.shapes.standard.Rectangle({
        position: {
          x: task.position?.x || 350, // Center horizontally
          y: 50 + level * 120 // Dynamic y-coordinate: 50px top margin + 120px per level
        },
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
        },
        vertices: [] // Ensure straight vertical lines
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
      { id: '1', name: 'Start Task', position: { x: 350, y: 50 } },
      { id: '2', name: 'Process Task', position: { x: 350, y: 170 } },
      { id: '3', name: 'End Task', position: { x: 350, y: 290 } }
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

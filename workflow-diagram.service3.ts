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
  private workflowData: WorkflowDiagram;

  constructor() {
    this.graph = new joint.dia.Graph();
    this.workflowData = { tasks: [], transitions: [] };
  }

  initializeDiagram(element: HTMLElement, onElementClick: (taskId: string) => void): void {
    this.paper = new joint.dia.Paper({
      el: element,
      model: this.graph,
      width: 800,
      height: 600,
      gridSize: 1,
      drawGrid: true,
      interactive: true
    });

    this.paper.on('element:pointerclick', (elementView: joint.dia.ElementView) => {
      const element = elementView.model as joint.shapes.standard.Rectangle;
      const taskId = Object.keys(this.workflowData.tasks).find(
        key => this.workflowData.tasks.find(t => t.id === element.id)?.id === element.id
      );
      if (taskId) {
        onElementClick(taskId);
      }
    });
  }

  getWorkflowData(): WorkflowDiagram {
    return this.workflowData;
  }

  parseAndRender(jsonData: WorkflowDiagram): void {
    this.workflowData = jsonData;
    this.graph.clear();

    const elements: { [key: string]: joint.shapes.standard.Rectangle } = {};
    const levels: { [key: string]: number } = {};
    const visited: Set<string> = new Set();

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

    jsonData.tasks.forEach(task => {
      if (!visited.has(task.id)) {
        calculateLevel(task.id);
      }
    });

    jsonData.tasks.forEach(task => {
      const level = levels[task.id] || 0;
      const rect = new joint.shapes.standard.Rectangle({
        id: task.id,
        position: {
          x: task.position?.x || 350,
          y: 50 + level * 120
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
        vertices: []
      });
      link.addTo(this.graph);
    });
  }

  addNodeBefore(targetTaskId: string, newTaskName: string): void {
    const newTaskId = `task-${Date.now()}`;
    const targetTask = this.workflowData.tasks.find(t => t.id === targetTaskId);
    if (!targetTask) return;

    const newLevel = (this.workflowData.tasks.find(t => t.id === targetTaskId)?.position?.y || 50) / 120 - 1;
    const newTask: Task = {
      id: newTaskId,
      name: newTaskName,
      position: { x: 350, y: 50 + newLevel * 120 }
    };

    this.workflowData.tasks.push(newTask);

    const incomingTransitions = this.workflowData.transitions?.filter(t => t.to === targetTaskId) || [];
    const outgoingTransitions = this.workflowData.transitions?.filter(t => t.from === targetTaskId) || [];

    if (this.workflowData.transitions) {
      this.workflowData.transitions = this.workflowData.transitions.filter(t => t.to !== targetTaskId);
      incomingTransitions.forEach(t => {
        this.workflowData.transitions!.push({ from: t.from, to: newTaskId });
      });
      this.workflowData.transitions.push({ from: newTaskId, to: targetTaskId });
    } else {
      this.workflowData.transitions = [{ from: newTaskId, to: targetTaskId }];
    }

    this.parseAndRender(this.workflowData);
  }

  addNodeAfter(targetTaskId: string, newTaskName: string): void {
    const newTaskId = `task-${Date.now()}`;
    const targetTask = this.workflowData.tasks.find(t => t.id === targetTaskId);
    if (!targetTask) return;

    const newLevel = (this.workflowData.tasks.find(t => t.id === targetTaskId)?.position?.y || 50) / 120 + 1;
    const newTask: Task = {
      id: newTaskId,
      name: newTaskName,
      position: { x: 350, y: 50 + newLevel * 120 }
    };

    this.workflowData.tasks.push(newTask);

    const outgoingTransitions = this.workflowData.transitions?.filter(t => t.from === targetTaskId) || [];
    if (this.workflowData.transitions) {
      this.workflowData.transitions = this.workflowData.transitions.filter(t => t.from !== targetTaskId);
      outgoingTransitions.forEach(t => {
        this.workflowData.transitions!.push({ from: newTaskId, to: t.to });
      });
      this.workflowData.transitions.push({ from: targetTaskId, to: newTaskId });
    } else {
      this.workflowData.transitions = [{ from: targetTaskId, to: newTaskId }];
    }

    this.parseAndRender(this.workflowData);
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
    <div style="margin-bottom: 10px;">
      <input #taskNameInput type="text" placeholder="New task name" />
      <button (click)="addNodeBefore()">Add Before</button>
      <button (click)="addNodeAfter()">Add After</button>
      <span *ngIf="selectedTaskId">Selected: {{ selectedTaskId }}</span>
    </div>
    <div #diagramContainer style="border: 1px solid #ccc;"></div>
    <pre>{{ workflowData | json }}</pre>
  `,
  styles: [`
    :host {
      display: block;
      width: 800px;
      height: 600px;
    }
    input, button {
      margin-right: 10px;
    }
    pre {
      margin-top: 10px;
      background: #f5f5f5;
      padding: 10px;
      max-height: 200px;
      overflow-y: auto;
    }
  `]
})
export class WorkflowDiagramComponent implements AfterViewInit {
  @ViewChild('diagramContainer') diagramContainer!: ElementRef;
  @ViewChild('taskNameInput') taskNameInput!: ElementRef<HTMLInputElement>;

  selectedTaskId: string | null = null;
  workflowData: WorkflowDiagram = {
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
    this.workflowDiagramService.initializeDiagram(this.diagramContainer.nativeElement, (taskId: string) => {
      this.selectedTaskId = taskId;
    });
    this.workflowDiagramService.parseAndRender(this.workflowData);
    this.updateWorkflowData();
  }

  addNodeBefore(): void {
    if (this.selectedTaskId && this.taskNameInput.nativeElement.value) {
      this.workflowDiagramService.addNodeBefore(this.selectedTaskId, this.taskNameInput.nativeElement.value);
      this.updateWorkflowData();
      this.taskNameInput.nativeElement.value = '';
    }
  }

  addNodeAfter(): void {
    if (this.selectedTaskId && this.taskNameInput.nativeElement.value) {
      this.workflowDiagramService.addNodeAfter(this.selectedTaskId, this.taskNameInput.nativeElement.value);
      this.updateWorkflowData();
      this.taskNameInput.nativeElement.value = '';
    }
  }

  private updateWorkflowData(): void {
    this.workflowData = this.workflowDiagramService.getWorkflowData();
  }
}

// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { WorkflowDiagramComponent } from './workflow-diagram.component';

@NgModule({
  declarations: [
    WorkflowDiagramComponent
  ],
  imports: [
    BrowserModule,
    FormsModule
  ],
  bootstrap: [WorkflowDiagramComponent]
})
export class AppModule { }

import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import Diagram from 'diagram-js';

@Component({
  selector: 'app-workflow-viewer',
  templateUrl: './workflow-viewer.component.html',
  styleUrls: ['./workflow-viewer.component.scss'],
})
export class WorkflowViewerComponent implements AfterViewInit {
  @ViewChild('diagramContainer') diagramContainer!: ElementRef;

  private diagram: any;
  private selectedTask: any = null;
  taskDetails: string | null = null;

  constructor() {}

  ngAfterViewInit() {
    // Initialize diagram-js
    this.diagram = new Diagram({
      container: this.diagramContainer.nativeElement,
    });

    // Create the workflow sequence
    this.createWorkflow();
  }

  createWorkflow() {
    const canvas = this.diagram.get('canvas');
    const elementFactory = this.diagram.get('elementFactory');
    const modeling = this.diagram.get('modeling');

    // Define workflow elements
    const startEvent = elementFactory.createShape({
      type: 'bpmn:StartEvent',
      x: 100,
      y: 200,
      width: 40,
      height: 40,
    });

    const validatePayloadTask = elementFactory.createShape({
      type: 'bpmn:Task',
      x: 200,
      y: 180,
      width: 100,
      height: 80,
      businessObject: { name: 'Validate Payload' },
    });

    const awaitingApprovalTask = elementFactory.createShape({
      type: 'bpmn:Task',
      x: 350,
      y: 180,
      width: 100,
      height: 80,
      businessObject: { name: 'Awaiting Approval' },
    });

    const userTask = elementFactory.createShape({
      type: 'bpmn:Task',
      x: 500,
      y: 180,
      width: 100,
      height: 80,
      businessObject: { name: 'User Task', id: 'userTask1' },
    });

    const endEvent = elementFactory.createShape({
      type: 'bpmn:EndEvent',
      x: 650,
      y: 200,
      width: 40,
      height: 40,
    });

    // Add elements to canvas
    canvas.addShape(startEvent);
    canvas.addShape(validatePayloadTask);
    canvas.addShape(awaitingApprovalTask);
    canvas.addShape(userTask);
    canvas.addShape(endEvent);

    // Connect the elements
    modeling.createConnection(
      startEvent,
      validatePayloadTask,
      { type: 'bpmn:SequenceFlow' },
      canvas
    );
    modeling.createConnection(
      validatePayloadTask,
      awaitingApprovalTask,
      { type: 'bpmn:SequenceFlow' },
      canvas
    );
    modeling.createConnection(
      awaitingApprovalTask,
      userTask,
      { type: 'bpmn:SequenceFlow' },
      canvas
    );
    modeling.createConnection(
      userTask,
      endEvent,
      { type: 'bpmn:SequenceFlow' },
      canvas
    );

    // Add labels
    modeling.updateLabel(validatePayloadTask, 'Validate Payload');
    modeling.updateLabel(awaitingApprovalTask, 'Awaiting Approval');
    modeling.updateLabel(userTask, 'User Task');

    // Add click event listener for User Task
    const eventBus = this.diagram.get('eventBus');
    eventBus.on('element.click', (e: any) => {
      if (e.element.businessObject && e.element.businessObject.id === 'userTask1') {
        this.showTaskDetails(e.element);
      }
    });
  }

  showTaskDetails(element: any) {
    this.selectedTask = element;
    this.taskDetails = `Task: ${element.businessObject.name}\nDetails: Perform the assigned user task.\nStatus: Pending`;
  }

  clearDetails() {
    this.taskDetails = null;
  }
}
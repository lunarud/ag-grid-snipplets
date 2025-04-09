Let’s create an Angular component that uses diagram-js to build a workflow viewer. This example will include a sequence with a “Validate Payload” task, an “Awaiting Approval” notification, and a “User Task” where clicking the task shows detailed information. Below is a step-by-step implementation.

Prerequisites
	1	Install Angular CLI: Ensure you have Angular CLI installed (npm install -g @angular/cli).
	2	Create a New Angular Project: Run ng new workflow-viewer --style=scss --routing=false and navigate into the project folder (cd workflow-viewer).
	3	Install diagram-js: Add diagram-js to your project by running: npm install diagram-js --save
	4	
	5	Install Additional Dependencies: For this example, we’ll use basic diagram-js features, but you can extend it with libraries like bpmn-js if needed.

Step 1: Set Up the Angular Component
Create a new component called workflow-viewer:
ng generate component workflow-viewer

Step 2: Implement the Workflow Viewer
Update the files in the workflow-viewer component to use diagram-js and create the workflow sequence.
`workflow-viewer.component.ts`
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
`workflow-viewer.component.html`
  

  
    
Task Details
    
{{ taskDetails }}
    Close
  

`workflow-viewer.component.scss`
.workflow-container {
  display: flex;
  height: 100vh;
  width: 100%;
}

.diagram-canvas {
  flex: 1;
  border: 1px solid #ccc;
}

.details-panel {
  width: 300px;
  padding: 20px;
  border-left: 1px solid #ccc;
  background-color: #f9f9f9;

  h3 {
    margin-top: 0;
  }

  pre {
    white-space: pre-wrap;
    font-family: monospace;
  }

  button {
    margin-top: 10px;
    padding: 5px 10px;
  }
}
`app.module.ts`
Update the app module to include the component:
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { WorkflowViewerComponent } from './workflow-viewer/workflow-viewer.component';

@NgModule({
  declarations: [AppComponent, WorkflowViewerComponent],
  imports: [BrowserModule],
  bootstrap: [AppComponent],
})
export class AppModule {}
`app.component.html`
Replace the default content with the workflow viewer:

`styles.scss`
Add global styles to ensure the canvas renders properly:
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

Step 3: Run the Application
Run the Angular app:
ng serve
Open your browser at http://localhost:4200. You should see a workflow diagram with:
	•	A “Start” event.
	•	A “Validate Payload” task.
	•	An “Awaiting Approval” task.
	•	A “User Task” (clickable to show details).
	•	An “End” event.
Clicking the “User Task” will display a details panel on the right with task information. The “Close” button clears the details.

Explanation
	1	Diagram-js Setup: The Diagram instance is initialized in ngAfterViewInit and attached to a container in the HTML.
	2	Workflow Sequence: A simple sequence is created with a start event, three tasks, and an end event, connected by sequence flows.
	3	User Interaction: The eventBus listens for clicks on the “User Task” and displays details in a side panel.
	4	Styling: Basic CSS ensures the diagram and details panel are laid out side by side.

Notes
	•	Extending with BPMN: For a more polished workflow viewer, consider using bpmn-js (a diagram-js extension) by installing npm install bpmn-js and importing BPMN-specific modules.
	•	Dynamic Data: You can extend this by passing a JSON payload to dynamically generate the workflow instead of hardcoding it.
	•	Validation: Add logic in createWorkflow to validate payloads or task states if needed.
This is a basic example to get you started. Let me know if you’d like to expand it further!

import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import BpmnViewer from 'bpmn-js/lib/Viewer';

@Component({
  selector: 'app-workflow-viewer',
  templateUrl: './workflow-viewer.component.html',
  styleUrls: ['./workflow-viewer.component.scss'],
})
export class WorkflowViewerComponent implements AfterViewInit {
  @ViewChild('diagramContainer') diagramContainer!: ElementRef;

  private viewer: any;
  taskDetails: string | null = null;
  private selectedElementId: string | null = null;

  constructor() {}

  ngAfterViewInit() {
    // Initialize bpmn-js viewer
    this.viewer = new BpmnViewer({
      container: this.diagramContainer.nativeElement,
    });

    // Load the vertical workflow diagram
    this.createAndLoadWorkflow();

    // Add click event listener for interactivity
    this.setupInteractivity();
  }

  async createAndLoadWorkflow() {
    // Define a vertical BPMN XML for the workflow
    const bpmnXML = `<?xml version="1.0" encoding="UTF-8"?>
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                       xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                       xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                       id="Definitions_1" 
                       targetNamespace="http://bpmn.io/schema/bpmn">
        <bpmn:process id="Process_1" isExecutable="true">
          <bpmn:startEvent id="StartEvent_1" />
          <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_ValidatePayload" />
          <bpmn:task id="Task_ValidatePayload" name="Validate Payload" />
          <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_ValidatePayload" targetRef="Task_AwaitingApproval" />
          <bpmn:task id="Task_AwaitingApproval" name="Awaiting Approval" />
          <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_AwaitingApproval" targetRef="Task_UserTask" />
          <bpmn:userTask id="Task_UserTask" name="User Task" />
          <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_UserTask" targetRef="EndEvent_1" />
          <bpmn:endEvent id="EndEvent_1" />
        </bpmn:process>
        <bpmndi:BPMNDiagram id="BPMNDiagram_1">
          <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
            <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
              <dc:Bounds x="300" y="50" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="Task_ValidatePayload_di" bpmnElement="Task_ValidatePayload">
              <dc:Bounds x="280" y="150" width="100" height="80" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="Task_AwaitingApproval_di" bpmnElement="Task_AwaitingApproval">
              <dc:Bounds x="280" y="300" width="100" height="80" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="Task_UserTask_di" bpmnElement="Task_UserTask">
              <dc:Bounds x="280" y="450" width="100" height="80" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
              <dc:Bounds x="300" y="600" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
              <dc:Point x="318" y="86" />
              <dc:Point x="318" y="150" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
              <dc:Point x="318" y="230" />
              <dc:Point x="318" y="300" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
              <dc:Point x="318" y="380" />
              <dc:Point x="318" y="450" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
              <dc:Point x="318" y="530" />
              <dc:Point x="318" y="600" />
            </bpmndi:BPMNEdge>
          </bpmndi:BPMNPlane>
        </bpmndi:BPMNDiagram>
      </bpmn:definitions>`;

    try {
      // Import the BPMN XML into the viewer
      await this.viewer.importXML(bpmnXML);
      const canvas = this.viewer.get('canvas');
      canvas.zoom('fit-viewport');
    } catch (err) {
      console.error('Error importing BPMN XML:', err);
    }
  }

  setupInteractivity() {
    const eventBus = this.viewer.get('eventBus');
    const elementRegistry = this.viewer.get('elementRegistry');
    const canvas = this.viewer.get('canvas');

    eventBus.on('element.click', (e: any) => {
      const element = e.element;

      // Handle clicks on tasks (including UserTask)
      if (
        element.businessObject.$type === 'bpmn:Task' ||
        element.businessObject.$type === 'bpmn:UserTask'
      ) {
        // Reset previous highlight
        if (this.selectedElementId) {
          const prevElement = elementRegistry.get(this.selectedElementId);
          if (prevElement) {
            canvas.removeMarker(prevElement, 'highlight');
          }
        }

        // Highlight the clicked element
        canvas.addMarker(element, 'highlight');
        this.selectedElementId = element.id;

        // Show task details
        this.showTaskDetails(element);
      }
    });
  }

  showTaskDetails(element: any) {
    const taskName = element.businessObject.name || 'Unnamed Task';
    const taskType = element.businessObject.$type === 'bpmn:UserTask' ? 'User Task' : 'Task';
    this.taskDetails = `Task: ${taskName}\nType: ${taskType}\nDetails: Perform the assigned task.\nStatus: Pending`;
  }

  clearDetails() {
    this.taskDetails = null;

    // Remove highlight from the selected element
    if (this.selectedElementId) {
      const elementRegistry = this.viewer.get('elementRegistry');
      const canvas = this.viewer.get('canvas');
      const element = elementRegistry.get(this.selectedElementId);
      if (element) {
        canvas.removeMarker(element, 'highlight');
      }
      this.selectedElementId = null;
    }
  }
}
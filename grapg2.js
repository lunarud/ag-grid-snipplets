import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import BpmnViewer from 'bpmn-js/lib/Viewer'; // Use Viewer for display-only, or Modeler for editing
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';

@Component({
  selector: 'app-workflow-viewer',
  templateUrl: './workflow-viewer.component.html',
  styleUrls: ['./workflow-viewer.component.scss'],
})
export class WorkflowViewerComponent implements AfterViewInit {
  @ViewChild('diagramContainer') diagramContainer!: ElementRef;

  private viewer: any;
  taskDetails: string | null = null;

  constructor() {}

  ngAfterViewInit() {
    // Initialize bpmn-js viewer
    this.viewer = new BpmnViewer({
      container: this.diagramContainer.nativeElement,
      additionalModules: [
        // Uncomment if you need properties panel in the future
        // BpmnPropertiesPanelModule,
        // BpmnPropertiesProviderModule
      ],
    });

    // Load the workflow diagram
    this.createAndLoadWorkflow();
  }

  async createAndLoadWorkflow() {
    // Define a simple BPMN XML for the workflow
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
              <dc:Bounds x="100" y="200" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="Task_ValidatePayload_di" bpmnElement="Task_ValidatePayload">
              <dc:Bounds x="200" y="180" width="100" height="80" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="Task_AwaitingApproval_di" bpmnElement="Task_AwaitingApproval">
              <dc:Bounds x="350" y="180" width="100" height="80" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="Task_UserTask_di" bpmnElement="Task_UserTask">
              <dc:Bounds x="500" y="180" width="100" height="80" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
              <dc:Bounds x="650" y="200" width="36" height="36" />
            </bpmndi:BPMNShape>
            <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
              <dc:Point x="136" y="218" />
              <dc:Point x="200" y="218" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
              <dc:Point x="300" y="218" />
              <dc:Point x="350" y="218" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
              <dc:Point x="450" y="218" />
              <dc:Point x="500" y="218" />
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
              <dc:Point x="600" y="218" />
              <dc:Point x="650" y="218" />
            </bpmndi:BPMNEdge>
          </bpmndi:BPMNPlane>
        </bpmndi:BPMNDiagram>
      </bpmn:definitions>`;

    try {
      // Import the BPMN XML into the viewer
      await this.viewer.importXML(bpmnXML);
      const canvas = this.viewer.get('canvas');
      canvas.zoom('fit-viewport');

      // Add click event listener for User Task
      const eventBus = this.viewer.get('eventBus');
      eventBus.on('element.click', (e: any) => {
        if (e.element.businessObject.$type === 'bpmn:UserTask' && e.element.id === 'Task_UserTask') {
          this.showTaskDetails(e.element);
        }
      });
    } catch (err) {
      console.error('Error importing BPMN XML:', err);
    }
  }

  showTaskDetails(element: any) {
    this.taskDetails = `Task: ${element.businessObject.name}\nDetails: Perform the assigned user task.\nStatus: Pending`;
  }

  clearDetails() {
    this.taskDetails = null;
  }
}
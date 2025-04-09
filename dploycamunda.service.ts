// camunda.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CamundaService {
  private readonly apiUrl = 'http://localhost:8080/engine-rest'; // Adjust to your Camunda URL

  constructor(private http: HttpClient) {}

  getProcessDefinitions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/process-definition`);
  }

  getTasksForProcess(processDefinitionId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/task`, {
      params: {
        processDefinitionId: processDefinitionId
      }
    });
  }

  getProcessDefinitionXml(processDefinitionId: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/process-definition/${processDefinitionId}/xml`)
      .pipe(map((response: any) => response.bpmn20Xml));
  }
}

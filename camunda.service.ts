// camunda.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CamundaService {
  private readonly apiUrl = 'http://localhost:8080/engine-rest'; // Adjust to your Camunda REST API URL

  constructor(private http: HttpClient) {}

  getProcessDefinitionXml(processDefinitionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/process-definition/${processDefinitionId}/xml`);
  }
}

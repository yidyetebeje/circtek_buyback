import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface IWorkflow {
  id?: string | number;
  name?: string;
  description?: string;
  canvasState?: any;
  position?: { x: number; y: number };
  scale?: number;
  clientId?: string | number;
  isPublished?: boolean;
  viewportPosition?: { x: number; y: number };
  viewportScale?: number;
  gridVisible?: boolean;
  gridSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private baseUrl = 'workflows';

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) { }

  createWorkflow(workflow: IWorkflow): Observable<any> {
    return this.apiService.post(this.baseUrl, workflow);
  }

  updateWorkflow(id: string, workflow: IWorkflow): Observable<any> {
    return this.apiService.put(`${this.baseUrl}/${id}`, workflow);
  }

  getWorkflow(id: string): Observable<IWorkflow | null> {
    return this.apiService.get(`${this.baseUrl}/${id}`);
  }

  getWorkflows(): Observable<any> {
    return this.apiService.get(this.baseUrl);
  }

  deleteWorkflow(id: string): Observable<any> {
    return this.apiService.delete(`${this.baseUrl}/${id}`);
  }
}

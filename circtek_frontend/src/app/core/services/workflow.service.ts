import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface IWorkflow {
  id?: string | number;
  name?: string;
  description?: string;
  canvas_state?: any;
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
  private baseUrl = '/configuration/workflows';

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) { }

  createWorkflow(workflow: IWorkflow): Observable<any> {
    return this.apiService.post(this.baseUrl, workflow);
  }

  updateWorkflow(id: string, workflow: IWorkflow): Observable<any> {
    return this.apiService.patch(`${this.baseUrl}/${id}`, workflow);
  }

  getWorkflow(id: string): Observable<IWorkflow | null> {
   
    return this.apiService.get<{data: IWorkflow | null, message: string, status: number}>(`${this.baseUrl}/${id}`)
      .pipe(
        map((response: {data: IWorkflow | null, message: string, status: number}) => {
         
          return response.data;
        })
      );
  }

  getWorkflows(): Observable<any> {
    return this.apiService.get<{data: any[], message: string, status: number}>(this.baseUrl)
      .pipe(
        map((response: {data: any[], message: string, status: number}) => {
         
          return response.data;
        })
      );
  }

  deleteWorkflow(id: string): Observable<any> {
    return this.apiService.delete(`${this.baseUrl}/${id}`);
  }
}

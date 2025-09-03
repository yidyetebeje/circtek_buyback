import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { LabelTemplateRecord, LabelTemplateCreateInput, LabelTemplateUpdateInput } from '../models/label-template';
import { ApiResponse } from '../models/api';

export interface IDocument {
  id: number;
  name: string;
  type?: string;
  client_id?: number;
}

export interface IDocumentQuery {
  page: number;
  limit: number;
  sortBy?: string;
  sortDirection?: string;
  client_id?: number;
}

export interface IDocumentResponse {
  data: IDocument[];
  total?: number;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  constructor(private apiService: ApiService) { }

  // Map generic document queries to label template listing
  getDocuments(query: IDocumentQuery): Observable<IDocumentResponse> {
    // Label templates list returns ApiResponse with data + pagination optionally
    // We adapt to IDocumentResponse shape expected by callers of this service
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    return this.apiService
      .get(`/configuration/label-templates?${params.toString()}`)
      .pipe(
        map((res: any) => {
          const rows: LabelTemplateRecord[] = res?.data ?? res ?? [];
          return {
            data: rows.map((r) => ({ id: r.id, name: r.name, type: 'label', client_id: (r as any).client_id })),
            total: res?.total,
            page: res?.page,
            limit: res?.limit,
          } as IDocumentResponse;
        })
      );
  }

  // Single fetch mapped to label templates
  getDocument(id: number): Observable<any> {
    return this.apiService
      .get<ApiResponse<LabelTemplateRecord | null>>(`/configuration/label-templates/${id}`)
      .pipe(map((res) => (res as any).data ?? null));
  }

  // Create mapped to label templates
  createDocument(payload: Partial<LabelTemplateCreateInput & { canvas_state: any }>): Observable<any> {
    // The backend expects canvas_state as JSON or string; pass through as-is
    return this.apiService.createLabelTemplate(payload as LabelTemplateCreateInput);
  }

  // Update mapped to label templates
  updateDocument(id: number, payload: Partial<LabelTemplateUpdateInput & { canvas_state: any }>): Observable<any> {
    return this.apiService.updateLabelTemplate(id, payload as LabelTemplateUpdateInput);
  }

  deleteDocument(id: number): Observable<any> {
    return this.apiService.deleteLabelTemplate(id);
  }
}

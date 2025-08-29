import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DiagnosticListResponse } from '../models/diagnostic';
import { WarehouseListResponse } from '../models/warehouse';
import { TenantListResponse } from '../models/tenant';
import { ApiResponse } from '../models/api';
import { User } from '../models/user';
import { Role } from '../models/role';
import { WiFiProfile } from '../models/wifi-profile';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  get<T>(path: string, params: HttpParams = new HttpParams()): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}${path}`, { params, withCredentials: true });
  }

  post<T>(path: string, body: object = {}): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}${path}`, body, { withCredentials: true });
  }

  put<T>(path: string, body: object = {}): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}${path}`, body, { withCredentials: true });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}${path}`, { withCredentials: true });
  }

  getDiagnostics(params: HttpParams = new HttpParams()): Observable<DiagnosticListResponse> {
    return this.get<DiagnosticListResponse>('/diagnostics/tests', params);
  }

  // Warehouses list (tenant-scoped by backend unless super_admin)
  getWarehouses(params: HttpParams = new HttpParams()): Observable<WarehouseListResponse> {
    return this.get<WarehouseListResponse>('/warehouses', params);
  }

  // Users list (use role_id filter to fetch testers)
  getUsers(params: HttpParams = new HttpParams()): Observable<ApiResponse<User[]>> {
    return this.get<ApiResponse<User[]>>('/users', params);
  }

  // Tenants list (super_admin only)
  getTenants(params: HttpParams = new HttpParams()): Observable<TenantListResponse> {
    return this.get<TenantListResponse>('/tenants', params);
  }

  // Roles list (super_admin only)
  getRoles(params: HttpParams = new HttpParams()): Observable<ApiResponse<Role[]>> {
    return this.get<ApiResponse<Role[]>>('/roles', params);
  }

  // WiFi Profiles list (tenant-scoped; no server pagination)
  getWifiProfiles(params: HttpParams = new HttpParams()): Observable<ApiResponse<WiFiProfile[]>> {
    return this.get<ApiResponse<WiFiProfile[]>>('/wifi-profiles', params);
  }
}


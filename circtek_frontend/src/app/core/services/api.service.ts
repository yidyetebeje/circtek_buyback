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
  patch<T>(path: string, body: object = {}): Observable<T> {
    return this.http.patch<T>(`${this.apiUrl}${path}`, body, { withCredentials: true });
  }

  getDiagnostics(params: HttpParams = new HttpParams()): Observable<DiagnosticListResponse> {
    return this.get<DiagnosticListResponse>('/diagnostics/tests', params);
  }

  // Warehouses list (tenant-scoped by backend unless super_admin)
  getWarehouses(params: HttpParams = new HttpParams()): Observable<WarehouseListResponse> {
    return this.get<WarehouseListResponse>('/warehouses', params);
  }

  // Get single warehouse
  getWarehouse(id: number): Observable<any> {
    return this.get<any>(`/warehouses/${id}`);
  }

  // Create warehouse
  createWarehouse(warehouseData: any): Observable<ApiResponse<any>> {
    return this.post<ApiResponse<any>>('/warehouses', warehouseData);
  }

  // Update warehouse
  updateWarehouse(id: number, warehouseData: any): Observable<ApiResponse<any>> {
    return this.patch<ApiResponse<any>>(`/warehouses/${id}`, warehouseData);
  }

  // Delete warehouse
  deleteWarehouse(id: number): Observable<ApiResponse<any>> {
    return this.delete<ApiResponse<any>>(`/warehouses/${id}`);
  }

  // Users list (use role_id filter to fetch testers)
  getUsers(params: HttpParams = new HttpParams()): Observable<ApiResponse<User[]>> {
    return this.get<ApiResponse<User[]>>('/users', params);
  }

  // Get single user
  getUser(id: number): Observable<User> {
    return this.get<User>(`/users/${id}`);
  }

  // Create user
  createUser(userData: any): Observable<ApiResponse<User>> {
    return this.post<ApiResponse<User>>('/users', userData);
  }

  // Update user
  updateUser(id: number, userData: any): Observable<ApiResponse<User>> {
    return this.patch<ApiResponse<User>>(`/users/${id}`, userData);
  }

  // Delete user
  deleteUser(id: number): Observable<ApiResponse<any>> {
    return this.delete<ApiResponse<any>>(`/users/${id}`);
  }

  // Tenants list (super_admin only)
  getTenants(params: HttpParams = new HttpParams()): Observable<TenantListResponse> {
    return this.get<TenantListResponse>('/tenants', params);
  }

  // Create tenant (super_admin only)
  createTenant(tenantData: any): Observable<ApiResponse<any>> {
    return this.post<ApiResponse<any>>('/tenants', tenantData);
  }

  // Update tenant (super_admin only)
  updateTenant(id: number, tenantData: any): Observable<ApiResponse<any>> {
    return this.patch<ApiResponse<any>>(`/tenants/${id}`, tenantData);
  }

  // Delete tenant (super_admin only)
  deleteTenant(id: number): Observable<ApiResponse<any>> {
    return this.delete<ApiResponse<any>>(`/tenants/${id}`);
  }

  // Roles list (super_admin only)
  getRoles(params: HttpParams = new HttpParams()): Observable<ApiResponse<Role[]>> {
    return this.get<ApiResponse<Role[]>>('/roles', params);
  }

  // WiFi Profiles list (tenant-scoped; no server pagination)
  getWifiProfiles(params: HttpParams = new HttpParams()): Observable<ApiResponse<WiFiProfile[]>> {
    return this.get<ApiResponse<WiFiProfile[]>>('/configuration/wifi-profiles', params);
  }

  // Get single WiFi profile
  getWifiProfile(id: number): Observable<WiFiProfile> {
    return this.get<WiFiProfile>(`/configuration/wifi-profiles/${id}`);
  }

  // Create WiFi profile
  createWifiProfile(wifiProfileData: any): Observable<ApiResponse<WiFiProfile>> {
    return this.post<ApiResponse<WiFiProfile>>('/configuration/wifi-profiles', wifiProfileData);
  }

  // Update WiFi profile
  updateWifiProfile(id: number, wifiProfileData: any): Observable<ApiResponse<WiFiProfile>> {
    return this.patch<ApiResponse<WiFiProfile>>(`/configuration/wifi-profiles/${id}`, wifiProfileData);
  }

  // Delete WiFi profile
  deleteWifiProfile(id: number): Observable<ApiResponse<any>> {
    return this.delete<ApiResponse<any>>(`/configuration/wifi-profiles/${id}`);
  }

  // Assign WiFi profile to a tester
  assignWifiProfile(profileId: number, userId: number): Observable<ApiResponse<{ user_id: number; wifi_profile_id: number }>> {
    return this.post<ApiResponse<{ user_id: number; wifi_profile_id: number }>>(`/configuration/wifi-profiles/${profileId}/assign/${userId}`);
  }

  // Unassign WiFi profile from a tester
  unassignWifiProfile(profileId: number, userId: number): Observable<ApiResponse<{ user_id: number; wifi_profile_id: null }>> {
    return this.post<ApiResponse<{ user_id: number; wifi_profile_id: null }>>(`/configuration/wifi-profiles/${profileId}/unassign/${userId}`);
  }

  // List assigned testers for a WiFi profile
  getWifiProfileTesters(profileId: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<User[]>> {
    return this.get<ApiResponse<User[]>>(`/configuration/wifi-profiles/${profileId}/testers`, params);
  }
}



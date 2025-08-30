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
import { StockWithWarehouse, StockSummary } from '../models/stock';
import { PurchaseRecord, PurchaseWithItemsAndReceived, ReceivingResult, ReceiveItemsRequest } from '../models/purchase';
import { TransferWithDetails, TransferCompletionResult, TransferSummary } from '../models/transfer';
import { RepairRecord, RepairWithItems, RepairCreateInput, RepairQueryInput, RepairConsumeItemsInput, RepairConsumeResult } from '../models/repair';

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

  // ===== Stock =====
  getStock(params: HttpParams = new HttpParams()): Observable<ApiResponse<StockWithWarehouse[]>> {
    return this.get<ApiResponse<StockWithWarehouse[]>>('/stock', params);
  }

  getStockSummary(): Observable<ApiResponse<StockSummary | null>> {
    return this.get<ApiResponse<StockSummary | null>>('/stock/summary');
  }

  getLowStock(threshold?: number): Observable<ApiResponse<StockWithWarehouse[]>> {
    const params = typeof threshold === 'number' ? new HttpParams().set('threshold', String(threshold)) : new HttpParams();
    return this.get<ApiResponse<StockWithWarehouse[]>>('/stock/low-stock', params);
  }

  getStockById(id: number): Observable<ApiResponse<StockWithWarehouse | null>> {
    return this.get<ApiResponse<StockWithWarehouse | null>>(`/stock/${id}`);
  }

  getStockBySkuWarehouse(sku: string, warehouseId: number): Observable<ApiResponse<StockWithWarehouse | null>> {
    return this.get<ApiResponse<StockWithWarehouse | null>>(`/stock/sku/${encodeURIComponent(sku)}/warehouse/${warehouseId}`);
  }

  createStock(payload: any): Observable<ApiResponse<StockWithWarehouse | null>> {
    return this.post<ApiResponse<StockWithWarehouse | null>>('/stock', payload);
  }

  updateStock(id: number, payload: any): Observable<ApiResponse<StockWithWarehouse | null>> {
    return this.patch<ApiResponse<StockWithWarehouse | null>>(`/stock/${id}`, payload);
  }

  deleteStock(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/stock/${id}`);
  }

  // ===== Purchases =====
  getPurchases(params: HttpParams = new HttpParams()): Observable<ApiResponse<PurchaseRecord[]>> {
    return this.get<ApiResponse<PurchaseRecord[]>>('/stock/purchases', params);
  }

  getPurchase(id: number): Observable<ApiResponse<PurchaseWithItemsAndReceived | null>> {
    return this.get<ApiResponse<PurchaseWithItemsAndReceived | null>>(`/stock/purchases/${id}`);
  }

  getPurchaseStatus(id: number): Observable<ApiResponse<any>> {
    return this.get<ApiResponse<any>>(`/stock/purchases/${id}/status`);
  }

  getPurchaseReceivedItems(id: number): Observable<ApiResponse<any[]>> {
    return this.get<ApiResponse<any[]>>(`/stock/purchases/${id}/received`);
  }

  createPurchase(payload: any): Observable<ApiResponse<PurchaseRecord | null>> {
    return this.post<ApiResponse<PurchaseRecord | null>>('/stock/purchases', payload);
  }

  createPurchaseWithItems(payload: any): Observable<ApiResponse<PurchaseWithItemsAndReceived | null>> {
    return this.post<ApiResponse<PurchaseWithItemsAndReceived | null>>('/stock/purchases/with-items', payload);
  }

  receivePurchaseItems(id: number, payload: Omit<ReceiveItemsRequest, 'purchase_id'>): Observable<ApiResponse<ReceivingResult | null>> {
    return this.post<ApiResponse<ReceivingResult | null>>(`/stock/purchases/${id}/receive`, payload);
  }

  deletePurchase(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/stock/purchases/${id}`);
  }

  // ===== Transfers =====
  getTransfers(params: HttpParams = new HttpParams()): Observable<ApiResponse<TransferWithDetails[]>> {
    return this.get<ApiResponse<TransferWithDetails[]>>('/transfers', params);
  }

  getTransferSummary(): Observable<ApiResponse<TransferSummary | null>> {
    return this.get<ApiResponse<TransferSummary | null>>('/transfers/summary');
  }

  getPendingTransfers(): Observable<ApiResponse<TransferWithDetails[]>> {
    return this.get<ApiResponse<TransferWithDetails[]>>('/transfers/pending');
  }

  getTransfer(id: number): Observable<ApiResponse<TransferWithDetails | null>> {
    return this.get<ApiResponse<TransferWithDetails | null>>(`/transfers/${id}`);
  }

  createTransfer(payload: any): Observable<ApiResponse<any>> {
    return this.post<ApiResponse<any>>('/transfers', payload);
  }

  createTransferWithItems(payload: any): Observable<ApiResponse<TransferWithDetails | null>> {
    return this.post<ApiResponse<TransferWithDetails | null>>('/transfers/with-items', payload);
  }

  completeTransfer(id: number): Observable<ApiResponse<TransferCompletionResult | null>> {
    // Backend fills transfer_id from route and actor_id from session; body can be empty
    return this.post<ApiResponse<TransferCompletionResult | null>>(`/transfers/${id}/complete`, {});
  }

  deleteTransfer(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/transfers/${id}`);
  }

  findDeviceByImeiOrSerial(identifier: string): Observable<ApiResponse<any | null>> {
    return this.get<ApiResponse<any | null>>(`/transfers/device-lookup/${encodeURIComponent(identifier)}`);
  }

  // ===== Repairs =====
  getRepairs(params: HttpParams = new HttpParams()): Observable<ApiResponse<RepairRecord[]>> {
    return this.get<ApiResponse<RepairRecord[]>>('/repairs', params);
  }

  getRepair(id: number): Observable<ApiResponse<RepairWithItems | null>> {
    return this.get<ApiResponse<RepairWithItems | null>>(`/repairs/${id}`);
  }

  createRepair(payload: RepairCreateInput): Observable<ApiResponse<RepairRecord | null>> {
    return this.post<ApiResponse<RepairRecord | null>>('/repairs', payload);
  }

  consumeRepairItems(id: number, payload: RepairConsumeItemsInput): Observable<ApiResponse<RepairConsumeResult | null>> {
    return this.post<ApiResponse<RepairConsumeResult | null>>(`/repairs/${id}/consume`, payload);
  }

  deleteRepair(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/repairs/${id}`);
  }

  // File Upload Methods
  uploadFile(file: File, folder?: string): Observable<ApiResponse<{ url: string; fileName: string; originalName: string; size: number; type: string } | null>> {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }
    
    return this.http.post<ApiResponse<{ url: string; fileName: string; originalName: string; size: number; type: string } | null>>(
      `${this.apiUrl}/uploads`, 
      formData, 
      { withCredentials: true }
    );
  }

  getSignedUrl(key: string, expiresIn?: number): Observable<ApiResponse<{ signedUrl: string; expiresIn: number } | null>> {
    const params = new HttpParams().set('expiresIn', (expiresIn || 3600).toString());
    return this.get<ApiResponse<{ signedUrl: string; expiresIn: number } | null>>(`/uploads/signed-url/${encodeURIComponent(key)}`, params);
  }

  getUploadUrl(key: string, contentType?: string, expiresIn?: number): Observable<ApiResponse<{ uploadUrl: string; key: string; expiresIn: number } | null>> {
    let params = new HttpParams().set('key', key);
    if (contentType) params = params.set('contentType', contentType);
    if (expiresIn) params = params.set('expiresIn', expiresIn.toString());
    
    return this.get<ApiResponse<{ uploadUrl: string; key: string; expiresIn: number } | null>>('/uploads/upload-url', params);
  }

  deleteFile(key: string): Observable<ApiResponse<{ deleted: boolean; key: string } | null>> {
    return this.delete<ApiResponse<{ deleted: boolean; key: string } | null>>(`/uploads/${encodeURIComponent(key)}`);
  }
}



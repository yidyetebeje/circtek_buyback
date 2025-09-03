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
import { PurchaseRecord, PurchaseWithItems, ReceiveItemsRequest, ReceivingResult } from '../models/purchase';
import { TransferWithDetails, TransferCompletionResult, TransferSummary } from '../models/transfer';
import { RepairRecord, RepairWithItems, RepairCreateInput, RepairQueryInput, RepairConsumeItemsInput, RepairConsumeResult, RepairCreateWithConsumeInput, RepairCreateWithConsumeResult } from '../models/repair';
import { SkuSpecsRecord, SkuSpecsCreateInput, SkuSpecsUpdateInput, SkuSpecsQueryInput, SkuSpecsListResponse } from '../models/sku-specs';
import { RepairReasonRecord, RepairReasonCreateInput, RepairReasonUpdateInput, RepairReasonQueryInput, RepairReasonListResponse } from '../models/repair-reason';
import { LabelTemplateRecord, LabelTemplateCreateInput, LabelTemplateUpdateInput, LabelTemplateListResponse } from '../models/label-template';
import { WorkflowRecord, WorkflowCreateInput, WorkflowUpdateInput, WorkflowListResponse } from '../models/workflow';

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

  // ===== Label Templates =====
  getLabelTemplates(params: HttpParams = new HttpParams()): Observable<LabelTemplateListResponse> {
    return this.get<LabelTemplateListResponse>('/configuration/label-templates', params);
  }

  getLabelTemplate(id: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<LabelTemplateRecord | null>> {
    return this.get<ApiResponse<LabelTemplateRecord | null>>(`/configuration/label-templates/${id}`, params);
  }

  createLabelTemplate(payload: LabelTemplateCreateInput): Observable<ApiResponse<LabelTemplateRecord | null>> {
    return this.post<ApiResponse<LabelTemplateRecord | null>>('/configuration/label-templates', payload as any);
  }

  updateLabelTemplate(id: number, payload: LabelTemplateUpdateInput): Observable<ApiResponse<LabelTemplateRecord | null>> {
    return this.patch<ApiResponse<LabelTemplateRecord | null>>(`/configuration/label-templates/${id}`, payload as any);
  }

  deleteLabelTemplate(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/configuration/label-templates/${id}`);
  }

  assignLabelTemplate(templateId: number, userId: number): Observable<ApiResponse<{ user_id: number; label_template_id: number } | null>> {
    return this.post<ApiResponse<{ user_id: number; label_template_id: number } | null>>(`/configuration/label-templates/${templateId}/assign/${userId}`);
  }

  unassignLabelTemplate(templateId: number, userId: number): Observable<ApiResponse<{ user_id: number; label_template_id: null } | null>> {
    return this.post<ApiResponse<{ user_id: number; label_template_id: null } | null>>(`/configuration/label-templates/${templateId}/unassign/${userId}`);
  }

  getLabelTemplateTesters(templateId: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<User[]>> {
    return this.get<ApiResponse<User[]>>(`/configuration/label-templates/${templateId}/testers`, params);
  }

  // ===== Workflows =====
  getWorkflows(params: HttpParams = new HttpParams()): Observable<WorkflowListResponse> {
    return this.get<WorkflowListResponse>('/configuration/workflows', params);
  }

  getWorkflow(id: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<WorkflowRecord | null>> {
    return this.get<ApiResponse<WorkflowRecord | null>>(`/configuration/workflows/${id}`, params);
  }

  createWorkflow(payload: WorkflowCreateInput): Observable<ApiResponse<WorkflowRecord | null>> {
    return this.post<ApiResponse<WorkflowRecord | null>>('/configuration/workflows', payload as any);
  }

  updateWorkflow(id: number, payload: WorkflowUpdateInput): Observable<ApiResponse<WorkflowRecord | null>> {
    return this.patch<ApiResponse<WorkflowRecord | null>>(`/configuration/workflows/${id}`, payload as any);
  }

  deleteWorkflow(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/configuration/workflows/${id}`);
  }

  assignWorkflow(workflowId: number, userId: number): Observable<ApiResponse<{ user_id: number; workflow_id: number } | null>> {
    return this.post<ApiResponse<{ user_id: number; workflow_id: number } | null>>(`/configuration/workflows/${workflowId}/assign/${userId}`);
  }

  unassignWorkflow(workflowId: number, userId: number): Observable<ApiResponse<{ user_id: number; workflow_id: null } | null>> {
    return this.post<ApiResponse<{ user_id: number; workflow_id: null } | null>>(`/configuration/workflows/${workflowId}/unassign/${userId}`);
  }

  getWorkflowTesters(workflowId: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<User[]>> {
    return this.get<ApiResponse<User[]>>(`/configuration/workflows/${workflowId}/testers`, params);
  }

  // ===== Stock =====
  getStock(params: HttpParams = new HttpParams()): Observable<ApiResponse<StockWithWarehouse[]>> {
    return this.get<ApiResponse<StockWithWarehouse[]>>('/stock/stock/', params);
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
    return this.post<ApiResponse<StockWithWarehouse | null>>('/stock/stock', payload);
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

  getPurchasesWithItems(params: HttpParams = new HttpParams()): Observable<ApiResponse<PurchaseWithItems[]>> {
    return this.get<ApiResponse<PurchaseWithItems[]>>('/stock/purchases/with-items', params);
  }

  getPurchaseWithItemsById(id: number): Observable<ApiResponse<PurchaseWithItems | null>> {
    return this.get<ApiResponse<PurchaseWithItems | null>>(`/stock/purchases/${id}/with-items`);
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

  createPurchaseWithItems(payload: any): Observable<ApiResponse<PurchaseWithItems | null>> {
    return this.post<ApiResponse<PurchaseWithItems | null>>('/stock/purchases/with-items', payload);
  }

  receiveItems(purchaseId: number, payload: ReceiveItemsRequest): Observable<ApiResponse<ReceivingResult | null>> {
    return this.post<ApiResponse<ReceivingResult | null>>(`/stock/purchases/${purchaseId}/receive`, payload);
  }

  receivePurchaseItems(payload: ReceiveItemsRequest): Observable<ApiResponse<ReceivingResult | null>> {
    return this.post<ApiResponse<ReceivingResult | null>>(`/stock/purchases/${payload.purchase_id}/receive`, payload);
  }

  deletePurchase(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/stock/purchases/${id}`);
  }

  // ===== Transfers =====
  getTransfers(params: HttpParams = new HttpParams()): Observable<ApiResponse<TransferWithDetails[]>> {
    return this.get<ApiResponse<TransferWithDetails[]>>('/stock/transfers', params);
  }

  getTransferSummary(): Observable<ApiResponse<TransferSummary | null>> {
    return this.get<ApiResponse<TransferSummary | null>>('/stock/transfers/summary');
  }

  getPendingTransfers(): Observable<ApiResponse<TransferWithDetails[]>> {
    return this.get<ApiResponse<TransferWithDetails[]>>('/stock/transfers/pending');
  }

  getTransfer(id: number): Observable<ApiResponse<TransferWithDetails | null>> {
    return this.get<ApiResponse<TransferWithDetails | null>>(`/stock/transfers/${id}`);
  }

  createTransfer(payload: any): Observable<ApiResponse<any>> {
    return this.post<ApiResponse<any>>('/stock/transfers', payload);
  }

  createTransferWithItems(payload: any): Observable<ApiResponse<TransferWithDetails | null>> {
    return this.post<ApiResponse<TransferWithDetails | null>>('/stock/transfers/with-items', payload);
  }

  completeTransfer(id: number, actorId: number): Observable<ApiResponse<TransferCompletionResult | null>> {
    const payload = {
      transfer_id: id,
      actor_id: actorId
    };
    return this.post<ApiResponse<TransferCompletionResult | null>>(`/stock/transfers/${id}/complete`, payload);
  }

  deleteTransfer(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/såtock/transfers/${id}`);
  }

  findDeviceByImeiOrSerial(identifier: string): Observable<ApiResponse<any | null>> {
    return this.get<ApiResponse<any | null>>(`/stock/transfers/device-lookup/${encodeURIComponent(identifier)}`);
  }

  // ===== Repairs =====
  getRepairs(params: HttpParams = new HttpParams()): Observable<ApiResponse<RepairRecord[]>> {
    return this.get<ApiResponse<RepairRecord[]>>('/stock/repairs', params);
  }

  getRepair(id: number): Observable<ApiResponse<RepairWithItems | null>> {
    return this.get<ApiResponse<RepairWithItems | null>>(`/såtock/repairs/${id}`);
  }

  createRepair(payload: RepairCreateInput): Observable<ApiResponse<RepairRecord | null>> {
    return this.post<ApiResponse<RepairRecord | null>>('/stock/repairs', payload);
  }

  consumeRepairItems(id: number, payload: RepairConsumeItemsInput): Observable<ApiResponse<RepairConsumeResult | null>> {
    return this.post<ApiResponse<RepairConsumeResult | null>>(`/såtock/repairs/${id}/consume`, payload);
  }

  createRepairWithConsume(payload: RepairCreateWithConsumeInput): Observable<ApiResponse<RepairCreateWithConsumeResult | null>> {
    return this.post<ApiResponse<RepairCreateWithConsumeResult | null>>('/stock/repairs/create-with-consume', payload);
  }

  deleteRepair(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/stock/repairs/${id}`);
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

  // SKU Specs API methods
  getSkuSpecs(params: HttpParams = new HttpParams()): Observable<SkuSpecsListResponse> {
    return this.get<SkuSpecsListResponse>('/stock/sku-specs', params);
  }

  getSkuSpecsById(id: number): Observable<ApiResponse<SkuSpecsRecord | null>> {
    return this.get<ApiResponse<SkuSpecsRecord | null>>(`/stock/sku-specs/${id}`);
  }

  getSkuSpecsBySku(sku: string): Observable<ApiResponse<SkuSpecsRecord | null>> {
    return this.get<ApiResponse<SkuSpecsRecord | null>>(`/stock/sku-specs/sku/${sku}`);
  }

  createSkuSpecs(data: SkuSpecsCreateInput): Observable<ApiResponse<SkuSpecsRecord | null>> {
    return this.post<ApiResponse<SkuSpecsRecord | null>>('/stock/sku-specs', data);
  }

  updateSkuSpecs(id: number, data: SkuSpecsUpdateInput): Observable<ApiResponse<SkuSpecsRecord | null>> {
    return this.patch<ApiResponse<SkuSpecsRecord | null>>(`/stock/sku-specs/${id}`, data);
  }

  deleteSkuSpecs(id: number): Observable<ApiResponse<{ id: number }>> {
    return this.delete<ApiResponse<{ id: number }>>(`/stock/sku-specs/${id}`);
  }

  searchSkuSpecsAutocomplete(query: string, limit: number = 10, is_part?: boolean): Observable<ApiResponse<Array<{ sku: string; model_name: string | null; is_part: boolean | null }>>> {
    let params = new HttpParams()
      .set('q', query)
      .set('limit', limit.toString());
    if (is_part !== undefined) {
      params = params.set('is_part', String(is_part));
    }
    return this.get<ApiResponse<Array<{ sku: string; model_name: string | null; is_part: boolean | null }>>>(`/stock/sku-specs/search/autocomplete`, params);
  }

  // Repair Reasons API methods
  getRepairReasons(params: HttpParams = new HttpParams()): Observable<RepairReasonListResponse> {
    return this.get<RepairReasonListResponse>('/stock/repair-reasons', params);
  }

  getRepairReason(id: number): Observable<ApiResponse<RepairReasonRecord | null>> {
    return this.get<ApiResponse<RepairReasonRecord | null>>(`/stock/repair-reasons/${id}`);
  }

  createRepairReason(data: RepairReasonCreateInput): Observable<ApiResponse<RepairReasonRecord | null>> {
    return this.post<ApiResponse<RepairReasonRecord | null>>('/stock/repair-reasons', data);
  }

  updateRepairReason(id: number, data: RepairReasonUpdateInput): Observable<ApiResponse<RepairReasonRecord | null>> {
    return this.put<ApiResponse<RepairReasonRecord | null>>(`/stock/repair-reasons/${id}`, data);
  }

  deleteRepairReason(id: number): Observable<ApiResponse<null>> {
    return this.delete<ApiResponse<null>>(`/stock/repair-reasons/${id}`);
  }
}

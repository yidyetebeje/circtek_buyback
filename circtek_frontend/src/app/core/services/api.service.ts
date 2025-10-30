import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DiagnosticListResponse } from '../models/diagnostic';
import { WarehouseListResponse } from '../models/warehouse';
import { Tenant, TenantListResponse } from '../models/tenant';
import { ApiResponse } from '../models/api';
import { User } from '../models/user';
import { Role } from '../models/role';
import { WiFiProfile } from '../models/wifi-profile';
import { StockWithWarehouse, StockSummary } from '../models/stock';
import { PurchaseRecord, PurchaseWithItems, ReceiveItemsRequest, ReceivingResult } from '../models/purchase';
import { TransferWithDetails, TransferCompletionResult, TransferSummary } from '../models/transfer';
import { RepairRecord, RepairWithItems, RepairCreateInput, RepairQueryInput, RepairConsumeItemsInput, RepairConsumeResult, RepairCreateWithConsumeInput, RepairCreateWithConsumeResult, RepairAnalytics, RepairAnalyticsQueryInput, ReasonAnalytics } from '../models/repair';
import { SkuSpecsRecord, SkuSpecsCreateInput, SkuSpecsUpdateInput, SkuSpecsQueryInput, SkuSpecsListResponse } from '../models/sku-specs';
import { RepairReasonRecord, RepairReasonCreateInput, RepairReasonUpdateInput, RepairReasonQueryInput, RepairReasonListResponse, RepairReasonWithModelPrices, RepairReasonModelPriceRecord, RepairReasonModelPriceCreateInput, RepairReasonModelPriceUpdateInput } from '../models/repair-reason';
import { LabelTemplateRecord, LabelTemplateCreateInput, LabelTemplateUpdateInput, LabelTemplateListResponse } from '../models/label-template';
import { WorkflowRecord, WorkflowCreateInput, WorkflowUpdateInput, WorkflowListResponse } from '../models/workflow';
import { DashboardOverviewStats, WarehouseStats, RecentActivity, MonthlyTrend } from '../models/dashboard';
import { DeadIMEIRecord, DeadIMEICreateInput, DeadIMEIQueryInput, DeadIMEIResult } from '../models/dead-imei';
import { Grade, GradeCreateRequest, GradeUpdateRequest } from '../models/grade';
import { OtaUpdate, OtaUpdateCreateRequest, OtaUpdateUpdateRequest, OtaUpdateListResponse } from '../models/ota-update';
import { SkuUsageAnalyticsResult, SkuUsageAnalyticsQuery } from '../models/analytics';
import { ApiKey, ApiKeyCreated, ApiKeyCreateRequest, ApiKeyUpdateRequest, ApiKeyRevokeRequest, ApiKeyListResponse, ApiKeyUsageResponse } from '../models/api-key';
import { DiagnosticQuestion, DiagnosticQuestionOption, DiagnosticQuestionSet, DiagnosticQuestionSetAssignment, DiagnosticQuestionWithOptions, DiagnosticQuestionSetWithQuestions } from '../models/diagnostic-question';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  private handleError = (err: HttpErrorResponse) => {
    if (err.status === 401 || err.status === 403) {
      try {
        // Clear any stored token and redirect to login
        localStorage.removeItem('auth_token');
      } catch {}
      this.router.navigate(['/login']);
    }
    return throwError(() => err);
  };

  get<T>(path: string, params: HttpParams = new HttpParams()): Observable<T> {
    return this.http
      .get<T>(`${this.apiUrl}${path}`, { params, withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  post<T>(path: string, body: object = {}): Observable<T> {
    return this.http
      .post<T>(`${this.apiUrl}${path}`, body, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  put<T>(path: string, body: object = {}): Observable<T> {
    return this.http
      .put<T>(`${this.apiUrl}${path}`, body, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<T>(`${this.apiUrl}${path}`, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }
  patch<T>(path: string, body: object = {}): Observable<T> {
    return this.http
      .patch<T>(`${this.apiUrl}${path}`, body, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  getDiagnostics(params: HttpParams = new HttpParams()): Observable<DiagnosticListResponse> {
    return this.get<DiagnosticListResponse>('/diagnostics/tests', params);
  }

  exportDiagnostics(params: HttpParams = new HttpParams()): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/diagnostics/tests/export`, {
        params,
        withCredentials: true,
        responseType: 'blob'
      })
      .pipe(catchError(this.handleError));
  }

  getPublicDiagnostic(id: number): Observable<ApiResponse<any>> {
    return this.get<ApiResponse<any>>(`/diagnostics/public/tests/${id}`);
  }

  // Download diagnostic report as PDF
  downloadDiagnosticPdf(id: number): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/diagnostics/tests/${id}/pdf`, {
        withCredentials: true,
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      })
      .pipe(catchError(this.handleError));
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

  getTenant(id: number): Observable<ApiResponse<Tenant>> {
    return this.get<ApiResponse<Tenant>>(`/tenants/${id}`);
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

  // ===== Grades =====
  getGrades(params: HttpParams = new HttpParams()): Observable<ApiResponse<Grade[]>> {
    return this.get<ApiResponse<Grade[]>>('/configuration/grades', params);
  }

  getGrade(id: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<Grade | null>> {
    return this.get<ApiResponse<Grade | null>>(`/configuration/grades/${id}`, params);
  }

  createGrade(payload: GradeCreateRequest): Observable<ApiResponse<Grade | null>> {
    return this.post<ApiResponse<Grade | null>>('/configuration/grades', payload);
  }

  updateGrade(id: number, payload: GradeUpdateRequest): Observable<ApiResponse<Grade | null>> {
    return this.patch<ApiResponse<Grade | null>>(`/configuration/grades/${id}`, payload);
  }

  deleteGrade(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/configuration/grades/${id}`);
  }

  // ===== OTA Updates =====
  getOtaUpdates(params: HttpParams = new HttpParams()): Observable<OtaUpdateListResponse> {
    return this.get<OtaUpdateListResponse>('/configuration/ota-updates', params);
  }

  getOtaUpdate(id: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<OtaUpdate | null>> {
    return this.get<ApiResponse<OtaUpdate | null>>(`/configuration/ota-updates/${id}`, params);
  }

  createOtaUpdate(payload: OtaUpdateCreateRequest): Observable<ApiResponse<OtaUpdate | null>> {
    return this.post<ApiResponse<OtaUpdate | null>>('/configuration/ota-updates', payload);
  }

  updateOtaUpdate(id: number, payload: OtaUpdateUpdateRequest): Observable<ApiResponse<OtaUpdate | null>> {
    return this.patch<ApiResponse<OtaUpdate | null>>(`/configuration/ota-updates/${id}`, payload);
  }

  deleteOtaUpdate(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/configuration/ota-updates/${id}`);
  }

  assignOtaUpdate(otaUpdateId: number, userId: number): Observable<ApiResponse<{ user_id: number; ota_update_id: number } | null>> {
    return this.post<ApiResponse<{ user_id: number; ota_update_id: number } | null>>(`/configuration/ota-updates/${otaUpdateId}/assign/${userId}`);
  }

  unassignOtaUpdate(otaUpdateId: number, userId: number): Observable<ApiResponse<{ user_id: number; ota_update_id: null } | null>> {
    return this.post<ApiResponse<{ user_id: number; ota_update_id: null } | null>>(`/configuration/ota-updates/${otaUpdateId}/unassign/${userId}`);
  }

  getOtaUpdateTesters(otaUpdateId: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<User[]>> {
    return this.get<ApiResponse<User[]>>(`/configuration/ota-updates/${otaUpdateId}/testers`, params);
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
    return this.delete<ApiResponse<{ id: number } | null>>(`/stock/transfers/${id}`);
  }

  findDeviceByImeiOrSerial(identifier: string): Observable<ApiResponse<any | null>> {
    return this.get<ApiResponse<any | null>>(`/stock/transfers/device-lookup/${encodeURIComponent(identifier)}`);
  }

  // ===== Repairs =====
  getRepairs(params: HttpParams = new HttpParams()): Observable<ApiResponse<RepairRecord[]>> {
    return this.get<ApiResponse<RepairRecord[]>>('/stock/repairs', params);
  }

  getRepair(id: number): Observable<ApiResponse<RepairWithItems | null>> {
    return this.get<ApiResponse<RepairWithItems | null>>(`/stock/repairs/${id}`);
  }

  createRepair(payload: RepairCreateInput): Observable<ApiResponse<RepairRecord | null>> {
    return this.post<ApiResponse<RepairRecord | null>>('/stock/repairs', payload);
  }

  consumeRepairItems(id: number, payload: RepairConsumeItemsInput): Observable<ApiResponse<RepairConsumeResult | null>> {
    return this.post<ApiResponse<RepairConsumeResult | null>>(`/stock/repairs/${id}/consume`, payload);
  }

  createRepairWithConsume(payload: RepairCreateWithConsumeInput): Observable<ApiResponse<RepairCreateWithConsumeResult | null>> {
    return this.post<ApiResponse<RepairCreateWithConsumeResult | null>>('/stock/repairs/create-with-consume', payload);
  }

  deleteRepair(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/stock/repairs/${id}`);
  }

  getRepairAnalytics(filters?: RepairAnalyticsQueryInput): Observable<ApiResponse<RepairAnalytics | null>> {
    let params = new HttpParams();
    if (filters?.date_from) params = params.set('date_from', filters.date_from);
    if (filters?.date_to) params = params.set('date_to', filters.date_to);
    if (filters?.warehouse_id) params = params.set('warehouse_id', filters.warehouse_id.toString());
    if (filters?.model_name) params = params.set('model_name', filters.model_name);
    if (filters?.reason_id) params = params.set('reason_id', filters.reason_id.toString());
    return this.get<ApiResponse<RepairAnalytics | null>>('/stock/repairs/analytics', params);
  }

  getRepairDeviceModels(): Observable<ApiResponse<string[]>> {
    return this.get<ApiResponse<string[]>>('/stock/repairs/device-models');
  }

  getIMEIAnalytics(filters?: any): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (filters?.date_from) params = params.set('date_from', filters.date_from);
    if (filters?.date_to) params = params.set('date_to', filters.date_to);
    if (filters?.warehouse_id) params = params.set('warehouse_id', filters.warehouse_id.toString());
    if (filters?.model_name) params = params.set('model_name', filters.model_name);
    if (filters?.reason_id) params = params.set('reason_id', filters.reason_id.toString());
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.page) params = params.set('page', filters.page.toString());
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    return this.get<ApiResponse<any>>('/stock/repairs/imei-analytics', params);
  }

  // ===== Dead IMEI =====
  getDeadIMEIHistory(params: HttpParams = new HttpParams()): Observable<ApiResponse<DeadIMEIRecord[]>> {
    return this.get<ApiResponse<DeadIMEIRecord[]>>('/stock/adjustments/dead-imei', params);
  }

  createDeadIMEIWriteOff(payload: DeadIMEICreateInput): Observable<ApiResponse<DeadIMEIResult | null>> {
    return this.post<ApiResponse<DeadIMEIResult | null>>('/stock/adjustments/dead-imei', payload);
  }

  // ===== Stock Adjustments =====
  createStockAdjustment(payload: {
    sku: string;
    warehouse_id: number;
    quantity_adjustment: number;
    reason: 'dead_imei' | 'inventory_loss' | 'manual_correction' | 'damage' | 'theft' | 'expired' | 'return_to_supplier';
    notes?: string;
    device_id?: number;
    actor_id: number;
  }): Observable<ApiResponse<any>> {
    return this.post<ApiResponse<any>>('/stock/adjustments', payload as any);
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
    ).pipe(catchError(this.handleError));
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

  // Model-specific pricing API methods
  getRepairReasonWithModelPrices(id: number): Observable<ApiResponse<RepairReasonWithModelPrices | null>> {
    return this.get<ApiResponse<RepairReasonWithModelPrices | null>>(`/stock/repair-reasons/${id}/with-model-prices`);
  }

  getModelPrices(repairReasonId: number): Observable<ApiResponse<RepairReasonModelPriceRecord[]>> {
    return this.get<ApiResponse<RepairReasonModelPriceRecord[]>>(`/stock/repair-reasons/${repairReasonId}/model-prices`);
  }

  createModelPrice(repairReasonId: number, data: RepairReasonModelPriceCreateInput): Observable<ApiResponse<RepairReasonModelPriceRecord | null>> {
    return this.post<ApiResponse<RepairReasonModelPriceRecord | null>>(`/stock/repair-reasons/${repairReasonId}/model-prices`, data);
  }

  updateModelPrice(priceId: number, data: RepairReasonModelPriceUpdateInput): Observable<ApiResponse<RepairReasonModelPriceRecord | null>> {
    return this.put<ApiResponse<RepairReasonModelPriceRecord | null>>(`/stock/repair-reasons/model-prices/${priceId}`, data);
  }

  deleteModelPrice(priceId: number): Observable<ApiResponse<null>> {
    return this.delete<ApiResponse<null>>(`/stock/repair-reasons/model-prices/${priceId}`);
  }

  // ===== Dashboard Stats =====
  getDashboardOverview(params: HttpParams = new HttpParams()): Observable<ApiResponse<DashboardOverviewStats>> {
    return this.get<ApiResponse<DashboardOverviewStats>>('/dashboard/overview', params);
  }

  getDashboardWarehouseStats(params: HttpParams = new HttpParams()): Observable<ApiResponse<WarehouseStats[]>> {
    return this.get<ApiResponse<WarehouseStats[]>>('/dashboard/warehouses', params);
  }

  getDashboardRecentActivity(params: HttpParams = new HttpParams()): Observable<ApiResponse<RecentActivity[]>> {
    return this.get<ApiResponse<RecentActivity[]>>('/dashboard/activity', params);
  }

  getDashboardMonthlyTrends(params: HttpParams = new HttpParams()): Observable<ApiResponse<MonthlyTrend[]>> {
    return this.get<ApiResponse<MonthlyTrend[]>>('/dashboard/trends', params);
  }

  // ===== Device Events =====
  getDeviceEvents(params: HttpParams = new HttpParams()): Observable<ApiResponse<any[]>> {
    return this.get<ApiResponse<any[]>>('/stock/device-events', params);
  }

  // ===== Analytics =====
  getSkuUsageAnalytics(params: HttpParams = new HttpParams()): Observable<ApiResponse<SkuUsageAnalyticsResult | null>> {
    return this.get<ApiResponse<SkuUsageAnalyticsResult | null>>('/stock/analytics/sku-usage', params);
  }

  getPartsAtRisk(params: HttpParams = new HttpParams()): Observable<ApiResponse<SkuUsageAnalyticsResult | null>> {
    return this.get<ApiResponse<SkuUsageAnalyticsResult | null>>('/stock/analytics/parts-at-risk', params);
  }

  getHighUsageParts(params: HttpParams = new HttpParams()): Observable<ApiResponse<SkuUsageAnalyticsResult | null>> {
    return this.get<ApiResponse<SkuUsageAnalyticsResult | null>>('/stock/analytics/high-usage-parts', params);
  }

  getWarehouseUsageSummary(warehouseId: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<SkuUsageAnalyticsResult | null>> {
    return this.get<ApiResponse<SkuUsageAnalyticsResult | null>>(`/stock/analytics/warehouse/${warehouseId}/usage`, params);
  }

  getSkuUsageAcrossWarehouses(sku: string, params: HttpParams = new HttpParams()): Observable<ApiResponse<SkuUsageAnalyticsResult | null>> {
    return this.get<ApiResponse<SkuUsageAnalyticsResult | null>>(`/stock/analytics/sku/${encodeURIComponent(sku)}/usage`, params);
  }

  exportSkuUsageAnalytics(params: HttpParams = new HttpParams()): Observable<ApiResponse<SkuUsageAnalyticsResult | string | null>> {
    return this.get<ApiResponse<SkuUsageAnalyticsResult | string | null>>('/stock/analytics/export/sku-usage', params);
  }

  // ===== Stock In =====
  stockInDevice(request: any): Observable<ApiResponse<any>> {
    return this.post<ApiResponse<any>>('/stock/stock-in', request);
  }

  getDeviceGradeHistory(imei: string): Observable<ApiResponse<any[]>> {
    return this.get<ApiResponse<any[]>>(`/stock/stock-in/history/${encodeURIComponent(imei)}`);
  }

  searchDevicesByIdentifier(imei?: string, serial?: string): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (imei) params = params.set('imei', imei);
    if (serial) params = params.set('serial', serial);
    return this.get<ApiResponse<any[]>>('/devices', params);
  }

  // ===== API Keys (super_admin only) =====
  getApiKeys(params: HttpParams = new HttpParams()): Observable<ApiKeyListResponse> {
    return this.get<ApiKeyListResponse>('/external-api/api-keys', params);
  }

  getApiKey(id: number): Observable<ApiResponse<ApiKey>> {
    return this.get<ApiResponse<ApiKey>>(`/external-api/api-keys/${id}`);
  }

  createApiKey(data: ApiKeyCreateRequest): Observable<ApiResponse<ApiKeyCreated>> {
    return this.post<ApiResponse<ApiKeyCreated>>('/external-api/api-keys', data);
  }

  updateApiKey(id: number, data: ApiKeyUpdateRequest): Observable<ApiResponse<ApiKey>> {
    return this.patch<ApiResponse<ApiKey>>(`/external-api/api-keys/${id}`, data);
  }

  revokeApiKey(id: number, data: ApiKeyRevokeRequest): Observable<ApiResponse<any>> {
    return this.post<ApiResponse<any>>(`/external-api/api-keys/${id}/revoke`, data);
  }

  deleteApiKey(id: number): Observable<ApiResponse<any>> {
    return this.delete<ApiResponse<any>>(`/external-api/api-keys/${id}`);
  }

  getApiKeyUsage(id: number, params: HttpParams = new HttpParams()): Observable<ApiKeyUsageResponse> {
    return this.get<ApiKeyUsageResponse>(`/external-api/api-keys/${id}/usage`, params);
  }

  // ===== Diagnostic Questions =====
  getDiagnosticQuestions(params: HttpParams = new HttpParams()): Observable<ApiResponse<DiagnosticQuestion[]>> {
    return this.get<ApiResponse<DiagnosticQuestion[]>>('/configuration/diagnostic-questions/questions', params);
  }

  getDiagnosticQuestion(id: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<DiagnosticQuestion | null>> {
    return this.get<ApiResponse<DiagnosticQuestion | null>>(`/configuration/diagnostic-questions/questions/${id}`, params);
  }

  getDiagnosticQuestionWithOptions(id: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<DiagnosticQuestionWithOptions | null>> {
    return this.get<ApiResponse<DiagnosticQuestionWithOptions | null>>(`/configuration/diagnostic-questions/questions/${id}/with-options`, params);
  }

  createDiagnosticQuestion(payload: any): Observable<ApiResponse<DiagnosticQuestion | null>> {
    return this.post<ApiResponse<DiagnosticQuestion | null>>('/configuration/diagnostic-questions/questions', payload);
  }

  updateDiagnosticQuestion(id: number, payload: any): Observable<ApiResponse<DiagnosticQuestion | null>> {
    return this.patch<ApiResponse<DiagnosticQuestion | null>>(`/configuration/diagnostic-questions/questions/${id}`, payload);
  }

  deleteDiagnosticQuestion(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/configuration/diagnostic-questions/questions/${id}`);
  }

  // Question Options
  getDiagnosticQuestionOptions(questionId: number): Observable<ApiResponse<DiagnosticQuestionOption[]>> {
    return this.get<ApiResponse<DiagnosticQuestionOption[]>>(`/configuration/diagnostic-questions/questions/${questionId}/options`);
  }

  createDiagnosticQuestionOption(payload: any): Observable<ApiResponse<DiagnosticQuestionOption | null>> {
    return this.post<ApiResponse<DiagnosticQuestionOption | null>>('/configuration/diagnostic-questions/options', payload);
  }

  updateDiagnosticQuestionOption(id: number, payload: any): Observable<ApiResponse<DiagnosticQuestionOption | null>> {
    return this.patch<ApiResponse<DiagnosticQuestionOption | null>>(`/configuration/diagnostic-questions/options/${id}`, payload);
  }

  deleteDiagnosticQuestionOption(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/configuration/diagnostic-questions/options/${id}`);
  }

  // Question Sets
  getDiagnosticQuestionSets(params: HttpParams = new HttpParams()): Observable<ApiResponse<DiagnosticQuestionSet[]>> {
    return this.get<ApiResponse<DiagnosticQuestionSet[]>>('/configuration/diagnostic-questions/sets', params);
  }

  getDiagnosticQuestionSet(id: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<DiagnosticQuestionSet | null>> {
    return this.get<ApiResponse<DiagnosticQuestionSet | null>>(`/configuration/diagnostic-questions/sets/${id}`, params);
  }

  getDiagnosticQuestionSetWithQuestions(id: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<DiagnosticQuestionSetWithQuestions | null>> {
    return this.get<ApiResponse<DiagnosticQuestionSetWithQuestions | null>>(`/configuration/diagnostic-questions/sets/${id}/with-questions`, params);
  }

  createDiagnosticQuestionSet(payload: any): Observable<ApiResponse<DiagnosticQuestionSet | null>> {
    console.log('=== API Service createDiagnosticQuestionSet ===');
    console.log('Payload before POST:', JSON.stringify(payload, null, 2));
    console.log('payload.status type:', typeof payload.status, 'value:', payload.status);
    return this.post<ApiResponse<DiagnosticQuestionSet | null>>('/configuration/diagnostic-questions/sets', payload);
  }

  // Bulk create question set with all questions, options, and translations
  bulkCreateDiagnosticQuestionSet(payload: any): Observable<ApiResponse<DiagnosticQuestionSet | null>> {
    return this.post<ApiResponse<DiagnosticQuestionSet | null>>('/configuration/diagnostic-questions/sets/bulk', payload);
  }

  // Bulk update question set with all questions, options, and translations
  bulkUpdateDiagnosticQuestionSet(setId: number, payload: any): Observable<ApiResponse<DiagnosticQuestionSet | null>> {
    return this.patch<ApiResponse<DiagnosticQuestionSet | null>>(`/configuration/diagnostic-questions/sets/${setId}/bulk`, payload);
  }

  updateDiagnosticQuestionSet(id: number, payload: any): Observable<ApiResponse<DiagnosticQuestionSet | null>> {
    return this.patch<ApiResponse<DiagnosticQuestionSet | null>>(`/configuration/diagnostic-questions/sets/${id}`, payload);
  }

  deleteDiagnosticQuestionSet(id: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/configuration/diagnostic-questions/sets/${id}`);
  }

  addQuestionToSet(setId: number, payload: { question_id: number; display_order?: number }): Observable<ApiResponse<{ success: boolean } | null>> {
    return this.post<ApiResponse<{ success: boolean } | null>>(`/configuration/diagnostic-questions/sets/${setId}/questions`, payload);
  }

  removeQuestionFromSet(setId: number, questionId: number): Observable<ApiResponse<{ success: boolean } | null>> {
    return this.delete<ApiResponse<{ success: boolean } | null>>(`/configuration/diagnostic-questions/sets/${setId}/questions/${questionId}`);
  }

  // Assignments
  getDiagnosticQuestionSetAssignments(params: HttpParams = new HttpParams()): Observable<ApiResponse<DiagnosticQuestionSetAssignment[]>> {
    return this.get<ApiResponse<DiagnosticQuestionSetAssignment[]>>('/configuration/diagnostic-questions/assignments', params);
  }

  assignDiagnosticQuestionSet(payload: { question_set_id: number; tester_id: number }): Observable<ApiResponse<{ success: boolean } | null>> {
    return this.post<ApiResponse<{ success: boolean } | null>>('/configuration/diagnostic-questions/assignments', payload);
  }

  unassignDiagnosticQuestionSet(assignmentId: number): Observable<ApiResponse<{ success: boolean } | null>> {
    return this.delete<ApiResponse<{ success: boolean } | null>>(`/configuration/diagnostic-questions/assignments/${assignmentId}`);
  }

  getDiagnosticQuestionSetAssignmentsByTester(testerId: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<DiagnosticQuestionSetAssignment[]>> {
    return this.get<ApiResponse<DiagnosticQuestionSetAssignment[]>>(`/configuration/diagnostic-questions/assignments/tester/${testerId}`, params);
  }

  getDiagnosticQuestionSetTesters(questionSetId: number, params: HttpParams = new HttpParams()): Observable<ApiResponse<User[]>> {
    return this.get<ApiResponse<User[]>>(`/configuration/diagnostic-questions/sets/${questionSetId}/testers`, params);
  }

  // Translations
  getQuestionTranslations(questionId: number): Observable<ApiResponse<any>> {
    return this.get<ApiResponse<any>>(`/configuration/diagnostic-questions/questions/${questionId}/translations`);
  }

  saveQuestionTranslations(questionId: number, payload: any): Observable<ApiResponse<{ success: boolean }>> {
    return this.post<ApiResponse<{ success: boolean }>>(`/configuration/diagnostic-questions/questions/${questionId}/translations`, payload);
  }

  deleteTranslation(translationId: number): Observable<ApiResponse<{ id: number } | null>> {
    return this.delete<ApiResponse<{ id: number } | null>>(`/configuration/diagnostic-questions/translations/${translationId}`);
  }
}

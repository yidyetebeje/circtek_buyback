import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LicenseType {
  id: number;
  name: string;
  product_category: string;
  test_type: string;
  price: string;
  description?: string;
  status: boolean;
  created_at: string;
  updated_at: string;
}

export interface LicenseBalance {
  license_type_id: number;
  license_type_name: string;
  product_category: string;
  test_type: string;
  balance: number;
  price: string;
}

export interface LicenseLedgerEntry {
  id: number;
  tenant_id: number;
  license_type_id: number;
  amount: number;
  transaction_type: 'purchase' | 'usage' | 'refund' | 'adjustment';
  reference_type?: string;
  reference_id?: number;
  device_identifier?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
}

export interface UsageReportEntry {
  tenant_id: number;
  tenant_name: string;
  license_type_id: number;
  license_type_name: string;
  product_category: string;
  test_type: string;
  quantity_used: number;
  unit_price: string;
  total_price: string;
}

export interface CreateLicenseTypeInput {
  name: string;
  product_category: string;
  test_type: string;
  price: number;
  description?: string;
}

export interface ManualAdjustmentInput {
  tenant_id: number;
  license_type_id: number;
  amount: number;
  notes: string;
}

export interface LicenseRequestItem {
  license_type_id: number;
  quantity: number;
  justification: string;
}

export interface LicenseRequest {
  id: number;
  tenant_id: number;
  tenant_name?: string;
  requested_by: number;
  requested_by_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  items: LicenseRequestItem[];
  notes?: string;
  reviewed_by?: number;
  reviewed_by_name?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLicenseRequestInput {
  items: LicenseRequestItem[];
  notes?: string;
}

export interface ReviewLicenseRequestInput {
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

export interface QuickGrantInput {
  tenant_id: number;
  grants: Array<{
    license_type_id: number;
    quantity: number;
  }>;
  notes: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LicensingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/licensing`;

  // Get license balances for current tenant
  getBalances(search?: string): Observable<ApiResponse<LicenseBalance[]>> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<ApiResponse<LicenseBalance[]>>(`${this.baseUrl}/balances`, { params });
  }

  // Get ledger history for current tenant
  getLedgerHistory(licenseTypeId?: number, transactionType?: string, search?: string): Observable<ApiResponse<LicenseLedgerEntry[]>> {
    let params = new HttpParams();
    if (licenseTypeId) {
      params = params.set('license_type_id', licenseTypeId.toString());
    }
    if (transactionType) {
      params = params.set('transaction_type', transactionType);
    }
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<ApiResponse<LicenseLedgerEntry[]>>(`${this.baseUrl}/ledger`, { params });
  }

  // List all license types
  listLicenseTypes(search?: string): Observable<ApiResponse<LicenseType[]>> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<ApiResponse<LicenseType[]>>(`${this.baseUrl}/license-types`, { params });
  }

  // Create new license type (superadmin only)
  createLicenseType(input: CreateLicenseTypeInput): Observable<ApiResponse<LicenseType>> {
    return this.http.post<ApiResponse<LicenseType>>(`${this.baseUrl}/license-types`, input);
  }

  // Manual license adjustment (superadmin only)
  createAdjustment(input: ManualAdjustmentInput): Observable<ApiResponse<LicenseLedgerEntry>> {
    return this.http.post<ApiResponse<LicenseLedgerEntry>>(`${this.baseUrl}/adjustments`, input);
  }

  // Get usage report (superadmin only)
  getUsageReport(startDate: string, endDate: string, tenantId?: number): Observable<ApiResponse<UsageReportEntry[]>> {
    let params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate);
    
    if (tenantId) {
      params = params.set('tenant_id', tenantId.toString());
    }
    
    return this.http.get<ApiResponse<UsageReportEntry[]>>(`${this.baseUrl}/reports/usage`, { params });
  }

  // Export usage report as CSV (superadmin only)
  exportUsageReport(startDate: string, endDate: string, tenantId?: number): Observable<Blob> {
    let params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate);
    
    if (tenantId) {
      params = params.set('tenant_id', tenantId.toString());
    }
    
    return this.http.get(`${this.baseUrl}/reports/usage/export`, {
      params,
      responseType: 'blob'
    });
  }

  // License Request Methods

  // Create a license request
  createLicenseRequest(input: CreateLicenseRequestInput): Observable<ApiResponse<LicenseRequest>> {
    return this.http.post<ApiResponse<LicenseRequest>>(`${this.baseUrl}/requests`, input);
  }

  // List license requests
  listLicenseRequests(status?: 'pending' | 'approved' | 'rejected', search?: string): Observable<ApiResponse<LicenseRequest[]>> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<ApiResponse<LicenseRequest[]>>(`${this.baseUrl}/requests`, { params });
  }

  // Get single license request
  getLicenseRequest(id: number): Observable<ApiResponse<LicenseRequest>> {
    return this.http.get<ApiResponse<LicenseRequest>>(`${this.baseUrl}/requests/${id}`);
  }

  // Review license request (approve/reject)
  reviewLicenseRequest(id: number, input: ReviewLicenseRequestInput): Observable<ApiResponse<LicenseRequest>> {
    return this.http.post<ApiResponse<LicenseRequest>>(`${this.baseUrl}/requests/${id}/review`, input);
  }

  // Quick grant licenses to a tenant
  quickGrant(input: QuickGrantInput): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/quick-grant`, input);
  }
}

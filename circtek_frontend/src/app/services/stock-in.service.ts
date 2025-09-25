import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from '../core/services/api.service';
import { ApiResponse } from '../core/models/api';

export interface Device {
  id: number;
  imei: string;
  serial: string;
  make: string;
  model_name: string;
  device_type: string;
  warehouse_id: number;
}

export interface Grade {
  id: number;
  name: string;
  color: string;
}

export interface Warehouse {
  id: number;
  name: string;
}

export interface StockInRequest {
  imei: string;
  grade_id: number;
  warehouse_id: number;
  remarks?: string;
}

export interface StockInResponse {
  device_id: number;
  imei: string;
  grade_id: number;
  grade_name: string;
  grade_color: string;
  warehouse_id: number;
  warehouse_name: string;
  actor_id: number;
  actor_name: string;
  message: string;
}

export interface GradeHistoryRecord {
  id: number;
  grade_name: string;
  grade_color: string;
  actor_id: number;
  created_at: string;
  status: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StockInService {
  private readonly apiService = inject(ApiService);

  /**
   * Search for devices by IMEI or Serial number
   */
  searchDevices(imei?: string, serial?: string): Observable<ApiResponse<Device[]>> {
    return this.apiService.searchDevicesByIdentifier(imei, serial);
  }

  /**
   * Get all grades for the current tenant
   */
  getGrades(): Observable<ApiResponse<Grade[]>> {
    return this.apiService.getGrades();
  }

  /**
   * Get all warehouses for the current tenant
   */
  getWarehouses(): Observable<ApiResponse<Warehouse[]>> {
    return this.apiService.getWarehouses();
  }

  /**
   * Stock in a device with grade assignment
   */
  stockInDevice(request: StockInRequest): Observable<ApiResponse<StockInResponse>> {
    return this.apiService.stockInDevice(request);
  }

  /**
   * Get device grade history by IMEI
   */
  getDeviceGradeHistory(imei: string): Observable<ApiResponse<GradeHistoryRecord[]>> {
    return this.apiService.getDeviceGradeHistory(imei);
  }
}

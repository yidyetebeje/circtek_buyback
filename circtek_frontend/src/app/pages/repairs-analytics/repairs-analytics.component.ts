import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { LucideAngularModule, Activity, Package, TrendingUp, DollarSign, Warehouse, Calendar, Search } from 'lucide-angular';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';

import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyService } from '../../core/services/currency.service';
import { RepairAnalytics, WarehouseAnalytics, ModelAnalytics } from '../../core/models/repair';
import { WarehouseListResponse } from '../../core/models/warehouse';

@Component({
  selector: 'app-repairs-analytics',
  imports: [CommonModule, FormsModule, LucideAngularModule, AppCurrencyPipe],
  templateUrl: './repairs-analytics.component.html',
  styleUrl: './repairs-analytics.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepairsAnalyticsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly currencyService = inject(CurrencyService);

  // Icons
  protected readonly TrendingUpIcon = TrendingUp;
  protected readonly PackageIcon = Package;
  protected readonly DollarSignIcon = DollarSign;
  protected readonly ActivityIcon = Activity;
  protected readonly CalendarIcon = Calendar;
  protected readonly WarehouseIcon = Warehouse;
  protected readonly SearchIcon = Search;

  // State
  protected readonly loading = signal(false);
  protected readonly analytics = signal<RepairAnalytics | null>(null);
  protected readonly warehouses = signal<Array<{ id: number; name: string }>>([]);
  protected readonly models = signal<string[]>([]);
  protected readonly reasons = signal<Array<{ id: number; name: string }>>([]);

  // Filters
  protected readonly dateFrom = signal<string>('');
  protected readonly dateTo = signal<string>('');
  protected readonly selectedWarehouse = signal<number | null>(null);
  protected readonly selectedModel = signal<string>('');
  protected readonly selectedReason = signal<number | null>(null);

  // Tabs
  protected readonly activeTab = signal<'overview' | 'by-model' | 'by-reason' | 'by-imei'>('overview');
  
  // IMEI analytics state
  protected readonly imeiData = signal<any[]>([]);
  protected readonly imeiTotal = signal(0);
  protected readonly imeiPage = signal(1);
  protected readonly imeiPageSize = signal(10);
  protected readonly imeiSearch = signal('');
  protected readonly expandedIMEIs = signal<Set<number>>(new Set());

  // Computed
  protected readonly summary = computed(() => this.analytics()?.summary);
  protected readonly warehouseData = computed(() => this.analytics()?.by_warehouse || []);
  protected readonly modelData = computed(() => this.analytics()?.by_model || []);
  protected readonly reasonData = computed(() => this.analytics()?.by_reason || []);

  // Expanded state for model details
  protected readonly expandedModels = signal<Set<string>>(new Set());

  // Expose Math for template
  protected readonly Math = Math;

  constructor() {
    // Load filters data
    this.loadWarehouses();
    this.loadDeviceModels();
    this.loadRepairReasons();
    
    // Load initial analytics
    this.loadAnalytics();
  }

  private loadWarehouses() {
    const params = new HttpParams().set('limit', '1000');
    this.api.getWarehouses(params).subscribe({
      next: (response) => {
        if (response.data) {
          this.warehouses.set(response.data.map(w => ({ id: w.id, name: w.name })));
        }
      },
      error: (error) => {
        console.error('Failed to load warehouses:', error);
      }
    });
  }

  private loadDeviceModels() {
    this.api.getRepairDeviceModels().subscribe({
      next: (response) => {
        if (response.data) {
          this.models.set(response.data);
        }
      },
      error: (error) => {
        console.error('Failed to load device models:', error);
      }
    });
  }

  private loadRepairReasons() {
    const params = new HttpParams().set('limit', '1000');
    this.api.getRepairReasons(params).subscribe({
      next: (response) => {
        if (response.data) {
          this.reasons.set(response.data.map(r => ({ id: r.id, name: r.name })));
        }
      },
      error: (error) => {
        console.error('Failed to load repair reasons:', error);
      }
    });
  }

  protected loadAnalytics() {
    this.loading.set(true);

    const filters: any = {};
    if (this.dateFrom()) filters.date_from = this.dateFrom();
    if (this.dateTo()) filters.date_to = this.dateTo();
    if (this.selectedWarehouse()) filters.warehouse_id = this.selectedWarehouse();
    if (this.selectedModel()) filters.model_name = this.selectedModel();
    if (this.selectedReason()) filters.reason_id = this.selectedReason();

    this.api.getRepairAnalytics(filters).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.data) {
          this.analytics.set(response.data);
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error('Failed to load analytics');
        console.error('Analytics error:', error);
      }
    });
  }

  protected resetFilters() {
    this.dateFrom.set('');
    this.dateTo.set('');
    this.selectedWarehouse.set(null);
    this.selectedModel.set('');
    this.selectedReason.set(null);
    this.loadAnalytics();
  }

  protected loadIMEIAnalytics() {
    this.loading.set(true);

    const filters: any = {
      page: this.imeiPage(),
      limit: this.imeiPageSize(),
    };
    if (this.dateFrom()) filters.date_from = this.dateFrom();
    if (this.dateTo()) filters.date_to = this.dateTo();
    if (this.selectedWarehouse()) filters.warehouse_id = this.selectedWarehouse();
    if (this.selectedModel()) filters.model_name = this.selectedModel();
    if (this.selectedReason()) filters.reason_id = this.selectedReason();
    if (this.imeiSearch()) filters.search = this.imeiSearch();

    this.api.getIMEIAnalytics(filters).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.data) {
          this.imeiData.set(response.data.items || []);
          this.imeiTotal.set(response.data.total || 0);
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error('Failed to load IMEI analytics');
        console.error('IMEI analytics error:', error);
      }
    });
  }

  protected onIMEIPageChange(page: number) {
    this.imeiPage.set(page);
    this.loadIMEIAnalytics();
  }

  protected onIMEISearch() {
    this.imeiPage.set(1);
    this.loadIMEIAnalytics();
  }

  protected toggleIMEIExpansion(deviceId: number) {
    const expanded = this.expandedIMEIs();
    const newExpanded = new Set(expanded);
    
    if (newExpanded.has(deviceId)) {
      newExpanded.delete(deviceId);
    } else {
      newExpanded.add(deviceId);
    }
    
    this.expandedIMEIs.set(newExpanded);
  }

  protected isIMEIExpanded(deviceId: number): boolean {
    return this.expandedIMEIs().has(deviceId);
  }

  protected toggleModelExpansion(modelName: string) {
    const expanded = this.expandedModels();
    const newExpanded = new Set(expanded);
    
    if (newExpanded.has(modelName)) {
      newExpanded.delete(modelName);
    } else {
      newExpanded.add(modelName);
    }
    
    this.expandedModels.set(newExpanded);
  }

  protected isModelExpanded(modelName: string): boolean {
    return this.expandedModels().has(modelName);
  }

  protected formatCurrency(value: number): string {
    const symbol = this.currencyService.getSymbolSync();
    const formatted = value.toFixed(2);
    return `${symbol}${formatted}`;
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }
}

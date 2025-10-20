import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { LucideAngularModule, TrendingUp, Package, DollarSign, Activity, Calendar, Warehouse, Search } from 'lucide-angular';

import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { RepairAnalytics, WarehouseAnalytics, ModelAnalytics } from '../../core/models/repair';
import { WarehouseListResponse } from '../../core/models/warehouse';

@Component({
  selector: 'app-repairs-analytics',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './repairs-analytics.component.html',
  styleUrls: ['./repairs-analytics.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepairsAnalyticsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

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
  protected readonly activeTab = signal<'overview' | 'by-model' | 'by-reason'>('overview');

  // Computed
  protected readonly summary = computed(() => this.analytics()?.summary);
  protected readonly warehouseData = computed(() => this.analytics()?.by_warehouse || []);
  protected readonly modelData = computed(() => this.analytics()?.by_model || []);
  protected readonly reasonData = computed(() => this.analytics()?.by_reason || []);

  // Expanded state for model details
  protected readonly expandedModels = signal<Set<string>>(new Set());

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }
}

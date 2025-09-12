import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, signal, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js/auto';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardOverviewStats, WarehouseStats, RecentActivity, MonthlyTrend } from '../../core/models/dashboard';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Signals for reactive state
  protected readonly isLoading = signal(true);
  protected readonly overviewData = signal<DashboardOverviewStats | null>(null);
  protected readonly warehouseStats = signal<WarehouseStats[]>([]);
  protected readonly recentActivity = signal<RecentActivity[]>([]);
  protected readonly monthlyTrends = signal<MonthlyTrend[]>([]);
  protected readonly dateRange = signal<{from: string, to: string} | null>(null);
  
  protected maxDate!: string;
  protected minDate!: string;

  // Chart configurations
  protected deviceTypeChart: ChartConfiguration | null = null;
  protected monthlyTrendsChart: ChartConfiguration | null = null;
  protected warehouseChart: ChartConfiguration | null = null;

  // Canvas refs
  @ViewChild('deviceTypeChart') private deviceTypeChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthlyTrendsChart') private monthlyTrendsChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('warehouseChart') private warehouseChartRef?: ElementRef<HTMLCanvasElement>;

  // Chart instances
  private deviceTypeChartInstance?: Chart;
  private monthlyTrendsChartInstance?: Chart;
  private warehouseChartInstance?: Chart;

  // View init state
  private viewInitialized = false;

  // Computed properties
  protected readonly isSuperAdmin = computed(() => {
    const user = this.authService.currentUser();
    return user?.role_name === 'super_admin';
  });

  ngOnInit() {
    this.loadDashboardData();
    this.maxDate = new Date().toISOString().split('T')[0];
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    this.minDate = twoYearsAgo.toISOString().split('T')[0];
  }

  ngAfterViewInit() {
    this.viewInitialized = true;
    console.log('ngAfterViewInit called, viewInitialized set to true');
    
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      console.log('Canvas refs available after requestAnimationFrame:', {
        deviceType: !!this.deviceTypeChartRef?.nativeElement,
        monthlyTrends: !!this.monthlyTrendsChartRef?.nativeElement,
        warehouse: !!this.warehouseChartRef?.nativeElement
      });
      
      // If data already loaded, create charts now
      if (this.overviewData() && this.monthlyTrends().length >= 0) {
        console.log('Data available in ngAfterViewInit, creating charts');
        this.createCharts();
      } else {
        console.log('No data available yet in ngAfterViewInit');
      }
    });
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  private loadDashboardData() {
    this.isLoading.set(true);
    
    // Get date range parameters
    const dateRange = this.dateRange();
    let params = new HttpParams();
    if (dateRange) {
      params = params.append('from', dateRange.from);
      params = params.append('to', dateRange.to);
    }
    
    // Load all dashboard data
    Promise.all([
      this.apiService.getDashboardOverview().toPromise(),
      this.apiService.getDashboardWarehouseStats().toPromise(),
      this.apiService.getDashboardRecentActivity().toPromise(),
      this.apiService.getDashboardMonthlyTrends(params).toPromise()
    ]).then(([overview, warehouses, activity, trends]) => {
      console.log('Dashboard data loaded:', { overview: overview?.data, warehouses: warehouses?.data, activity: activity?.data, trends: trends?.data });
      this.overviewData.set(overview!.data);
      this.warehouseStats.set(warehouses!.data);
      this.recentActivity.set(activity!.data);
      this.monthlyTrends.set(trends!.data);
      // Create charts after data and view are ready
      if (this.viewInitialized) {
        console.log('Creating charts - view initialized');
        requestAnimationFrame(() => this.createCharts());
      } else {
        console.log('View not initialized yet, charts will be created in ngAfterViewInit');
      }
      this.isLoading.set(false);
    }).catch(error => {
      console.error('Error loading dashboard data:', error);
      this.isLoading.set(false);
    });
  }

  private createCharts() {
    console.log('createCharts called');
    console.log('Canvas elements check:', {
      deviceTypeCanvas: this.deviceTypeChartRef?.nativeElement,
      monthlyTrendsCanvas: this.monthlyTrendsChartRef?.nativeElement,
      warehouseCanvas: this.warehouseChartRef?.nativeElement
    });
    this.setupDeviceTypeChart();
    this.setupMonthlyTrendsChart();
    this.setupWarehouseChart();
  }

  private setupDeviceTypeChart() {
    console.log('setupDeviceTypeChart called, overviewData:', this.overviewData());
    if (!this.overviewData()) {
      console.log('No overview data available for device type chart');
      return;
    }

    const testDeviceTypes = this.overviewData()!.test_devices_by_type;
    console.log('Test device types data:', testDeviceTypes);
    
    this.deviceTypeChart = {
      type: 'doughnut' as ChartType,
      data: {
        labels: testDeviceTypes.map(d => d.device_type),
        datasets: [{
          data: testDeviceTypes.map(d => d.test_count),
          backgroundColor: [
            '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom' as const
          },
          title: {
            display: true,
            text: 'Test Device Type Distribution'
          }
        }
      }
    };

    // Instantiate chart
    if (this.deviceTypeChartRef?.nativeElement) {
      console.log('Creating device type chart instance');
      const canvas = this.deviceTypeChartRef.nativeElement;
      const ctx = canvas.getContext('2d');
      console.log('Canvas element:', canvas);
      console.log('Canvas context:', ctx);
      console.log('Chart config:', this.deviceTypeChart);
      this.deviceTypeChartInstance?.destroy();
      try {
        this.deviceTypeChartInstance = new Chart(ctx!, this.deviceTypeChart);
        console.log('Device type chart created successfully');
      } catch (error) {
        console.error('Error creating device type chart:', error);
      }
    } else {
      console.log('Device type chart canvas ref not available');
    }
  }

  private setupMonthlyTrendsChart() {
    console.log('setupMonthlyTrendsChart called, monthlyTrends:', this.monthlyTrends());
    if (!this.monthlyTrends() || this.monthlyTrends().length === 0) {
      console.log('No monthly trends data available');
      return;
    }

    const trends = this.monthlyTrends()!;
    console.log('Monthly trends data:', trends);
    
    this.monthlyTrendsChart = {
      type: 'line' as ChartType,
      data: {
        labels: trends.map(t => t.month),
        datasets: [
          {
            label: 'Diagnostics',
            data: trends.map(t => t.diagnostics),
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const
          },
          title: {
            display: true,
            text: 'Monthly Diagnostics Trends'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };

    // Instantiate chart
    if (this.monthlyTrendsChartRef?.nativeElement) {
      console.log('Creating monthly trends chart instance');
      const canvas = this.monthlyTrendsChartRef.nativeElement;
      const ctx = canvas.getContext('2d');
      this.monthlyTrendsChartInstance?.destroy();
      try {
        this.monthlyTrendsChartInstance = new Chart(ctx!, this.monthlyTrendsChart);
        console.log('Monthly trends chart created successfully');
      } catch (error) {
        console.error('Error creating monthly trends chart:', error);
      }
    } else {
      console.log('Monthly trends chart canvas ref not available');
    }
  }

  private setupWarehouseChart() {
    console.log('setupWarehouseChart called, warehouseStats:', this.warehouseStats());
    if (!this.warehouseStats() || this.warehouseStats().length === 0) {
      console.log('No warehouse stats data available');
      return;
    }

    const warehouses = this.warehouseStats()!;
    console.log('Warehouse stats data:', warehouses);
    
    // Collect all device types across warehouses
    const allDeviceTypes = new Set<string>();
    warehouses.forEach(w => {
      w.device_type_counts.forEach(dt => allDeviceTypes.add(dt.device_type));
    });
    
    const deviceTypes = Array.from(allDeviceTypes);
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    
    const datasets = deviceTypes.map((deviceType, index) => ({
      label: deviceType,
      data: warehouses.map(w => {
        const deviceTypeData = w.device_type_counts.find(dt => dt.device_type === deviceType);
        return deviceTypeData ? deviceTypeData.test_count : 0;
      }),
      backgroundColor: colors[index % colors.length]
    }));
    
    this.warehouseChart = {
      type: 'bar' as ChartType,
      data: {
        labels: warehouses.map(w => w.warehouse_name),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const
          },
          title: {
            display: true,
            text: 'Test Count by Device Type per Warehouse'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };

    // Instantiate chart
    if (this.warehouseChartRef?.nativeElement) {
      console.log('Creating warehouse chart instance');
      const canvas = this.warehouseChartRef.nativeElement;
      const ctx = canvas.getContext('2d');
      this.warehouseChartInstance?.destroy();
      try {
        this.warehouseChartInstance = new Chart(ctx!, this.warehouseChart);
        console.log('Warehouse chart created successfully');
      } catch (error) {
        console.error('Error creating warehouse chart:', error);
      }
    } else {
      console.log('Warehouse chart canvas ref not available');
    }
  }

  private destroyCharts() {
    // Destroy chart instances
    this.deviceTypeChartInstance?.destroy();
    this.monthlyTrendsChartInstance?.destroy();
    this.warehouseChartInstance?.destroy();
    this.deviceTypeChartInstance = undefined;
    this.monthlyTrendsChartInstance = undefined;
    this.warehouseChartInstance = undefined;
    // Reset configs
    this.deviceTypeChart = null;
    this.monthlyTrendsChart = null;
    this.warehouseChart = null;
  }

  // Helper methods for template
  protected getReportColor(report: string): string {
    switch (report.toLowerCase()) {
      case 'pass': return 'text-green-600 bg-green-100';
      case 'fail': return 'text-red-600 bg-red-100';
      case 'partial pass': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  protected getReportBadgeClass(report: string): string {
    switch (report.toLowerCase()) {
      case 'pass': return 'badge-success';
      case 'fail': return 'badge-error';
      case 'partial pass': return 'badge-warning';
      default: return 'badge-neutral';
    }
  }

  protected navigateToReport(testId: number): void {
    // Navigate to the diagnostics page with the specific test result
    this.router.navigate(['/diagnostics/report', testId], { 
      queryParams: { identifier: testId.toString() } 
    });
  }

  protected formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  protected getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  protected onFromDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const fromDate = target.value;
    
    if (fromDate) {
      const currentRange = this.dateRange();
      const toDate = currentRange?.to || this.getCurrentDate();

      // If the new fromDate is after the current toDate, reset toDate to fromDate
      if (new Date(fromDate) > new Date(toDate)) {
        this.dateRange.set({
          from: fromDate,
          to: fromDate
        });
      } else {
        this.dateRange.set({
          from: fromDate,
          to: toDate
        });
      }
      
      this.loadDashboardData();
    }
  }

  protected onToDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const toDate = target.value;
    
    if (toDate) {
      const currentRange = this.dateRange();
      this.dateRange.set({
        from: currentRange?.from || this.getFirstDayOfMonth(),
        to: toDate
      });
      
      this.loadDashboardData();
    }
  }

  protected getFromDate(): string {
    return this.dateRange()?.from || this.getFirstDayOfMonth();
  }

  protected getToDate(): string {
    return this.dateRange()?.to || this.getCurrentDate();
  }

  protected resetDateRange(): void {
    this.dateRange.set(null);
    this.loadDashboardData();
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getFirstDayOfMonth(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }
}

import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, signal, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js/auto';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DiagnosticPdfService } from '../../shared/services/diagnostic-pdf.service';
import { DiagnosticDataService } from '../../core/services/diagnostic-data.service';
import { CipherService } from '../../core/services/cipher.service';
import { firstValueFrom } from 'rxjs';
import { DashboardOverviewStats, WarehouseStats, RecentActivity, MonthlyTrend } from '../../core/models/dashboard';
import { Diagnostic } from '../../core/models/diagnostic';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly diagnosticPdfService = inject(DiagnosticPdfService);
  private readonly diagnosticDataService = inject(DiagnosticDataService);
  private readonly cipherService = inject(CipherService);

  // Signals for reactive state
  protected readonly isLoading = signal(true);
  protected readonly overviewData = signal<DashboardOverviewStats | null>(null);
  protected readonly warehouseStats = signal<WarehouseStats[]>([]);
  protected readonly recentActivity = signal<RecentActivity[]>([]);
  protected readonly monthlyTrends = signal<MonthlyTrend[]>([]);
  protected readonly deviceTypes = signal<{ device_type: string; test_count: number }[]>([]);
  
  // New signals for date picker values
  protected readonly selectedFromDate = signal<string | null>(null);
  protected readonly selectedToDate = signal<string | null>(null);
  
  protected maxDate!: string;
  protected minDate!: string;

  // Unified Test Activity functionality (combines Quick Search + Recent Activity)
  protected readonly searchTerm = signal<string>('');
  protected readonly isSearching = signal<boolean>(false);
  protected readonly searchError = signal<string>('');
  protected readonly testResults = signal<Diagnostic[]>([]);
  protected readonly hasSearched = signal<boolean>(false);
  protected readonly showingSearchResults = computed(() => this.hasSearched() && this.searchTerm().trim().length > 0);
  protected readonly isDownloadingMap = signal<{[id: number]: boolean}>({});
  protected readonly isAnyDownloading = computed(() => Object.values(this.isDownloadingMap()).some(isDownloading => isDownloading));
  private searchTimeout: any = null;
  

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
    this.selectedFromDate.set(this.getFirstDayOfMonth());
    this.selectedToDate.set(this.getCurrentDate());
    this.loadDashboardData();
    this.maxDate = new Date().toISOString().split('T')[0];
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    this.minDate = twoYearsAgo.toISOString().split('T')[0];
    // Load recent test activity by default
    this.loadRecentTests();
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
    // Clean up search timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }

  private loadDashboardData() {
    this.isLoading.set(true);
    
    // Load all dashboard data except monthly trends initially
    Promise.all([
      firstValueFrom(this.apiService.getDashboardOverview()),
      firstValueFrom(this.apiService.getDashboardWarehouseStats()),
      firstValueFrom(this.apiService.getDashboardRecentActivity())
    ]).then(([overview, warehouses, activity]) => {
      console.log('Dashboard data loaded:', { overview: overview?.data, warehouses: warehouses?.data, activity: activity?.data });
      this.overviewData.set(overview!.data);
      this.warehouseStats.set(warehouses!.data);
      this.recentActivity.set(activity!.data);
      if (overview?.data?.test_devices_by_type) {
        this.deviceTypes.set(overview.data.test_devices_by_type);
      }
      // Create charts after data and view are ready
      if (this.viewInitialized) {
        console.log('Creating charts - view initialized');
        requestAnimationFrame(() => this.createCharts());
      } else {
        console.log('View not initialized yet, charts will be created in ngAfterViewInit');
      }
      this.isLoading.set(false);
      this.updateMonthlyTrendsChart(); // Load monthly trends after initial data
    }).catch(error => {
      console.error('Error loading dashboard data:', error);
      this.isLoading.set(false);
    });
  }

  private updateMonthlyTrendsChart() {
    const fromDate = this.selectedFromDate();
    const toDate = this.selectedToDate();

    if (fromDate && toDate) {
      let params = new HttpParams();
      params = params.append('from', fromDate);
      params = params.append('to', toDate);

      firstValueFrom(this.apiService.getDashboardMonthlyTrends(params)).then(trends => {
        this.monthlyTrends.set(trends!.data);
        // Defer chart setup to ensure canvas is rendered
        requestAnimationFrame(() => {
          this.setupMonthlyTrendsChart();
        });
      }).catch(error => {
        console.error('Error loading monthly trends data:', error);
      });
    }
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

    if (!testDeviceTypes || testDeviceTypes.length === 0) {
      console.log('No device types data available for chart');
      if (this.deviceTypeChartInstance) {
        this.deviceTypeChartInstance.destroy();
        this.deviceTypeChartInstance = undefined;
      }
      return;
    }
    
    this.deviceTypeChart = {
      type: 'doughnut' as ChartType,
      data: {
        labels: testDeviceTypes.map(d => d.device_type),
        datasets: [{
          data: testDeviceTypes.map(d => d.test_count),
          backgroundColor: [
            '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
            '#06B6D4', '#84CC16', '#F97316', '#A855F7', '#E11D48', '#059669'
          ],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: 1,
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }
        },
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: {
              padding: 20,
              font: {
                size: 12
              },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          title: {
            display: false  // Remove title to give more space to the chart
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed as number;
                const data = context.dataset.data as number[];
                const total = data.reduce((a, b) => (a || 0) + (b || 0), 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        elements: {
          arc: {
            borderWidth: 2
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
      if (this.monthlyTrendsChartInstance) {
        this.monthlyTrendsChartInstance.destroy();
        this.monthlyTrendsChartInstance = undefined;
      }
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
            display: false
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
      case 'pass': return 'text-primary bg-primary/20';
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
    // Navigate to the diagnostics page with encoded test ID for security
    const encodedId = this.cipherService.encodeTestId(testId);
    this.router.navigate(['/diagnostics/report', encodedId]);
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
    
    this.selectedFromDate.set(fromDate);
    
    // If the new fromDate is after the current toDate, reset toDate to fromDate
    if (this.selectedToDate() && new Date(fromDate) > new Date(this.selectedToDate()!)) {
      this.selectedToDate.set(fromDate);
    }

    if (this.selectedFromDate() && this.selectedToDate()) {
      this.updateMonthlyTrendsChart();
    }
  }

  protected onToDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const toDate = target.value;
    
    this.selectedToDate.set(toDate);

    if (this.selectedFromDate() && this.selectedToDate()) {
      this.updateMonthlyTrendsChart();
    }
  }

  protected getFromDate(): string {
    return this.selectedFromDate() || this.getFirstDayOfMonth();
  }

  protected getToDate(): string {
    return this.selectedToDate() || this.getCurrentDate();
  }

  protected resetDateRange(): void {
    this.selectedFromDate.set(this.getFirstDayOfMonth());
    this.selectedToDate.set(this.getCurrentDate());
    this.updateMonthlyTrendsChart();
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getFirstDayOfMonth(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }

  // Unified Test Search and Recent Activity Methods
  private loadRecentTests(): void {
    if (this.showingSearchResults()) return; // Don't load recent tests if showing search results
    
    this.isSearching.set(true);
    this.searchError.set('');

    const params = new HttpParams()
      .set('page', '1')
      .set('limit', '15')
      .set('sort_by', 'created_at')
      .set('sort_dir', 'desc');

    this.apiService.getDiagnostics(params).subscribe({
      next: (response) => {
        this.isSearching.set(false);
        if (response.data && response.data.length > 0) {
          this.testResults.set(response.data);
        } else {
          this.testResults.set([]);
        }
      },
      error: (error) => {
        this.isSearching.set(false);
        console.error('Error loading recent tests:', error);
        this.searchError.set('Failed to load recent test activity.');
      }
    });
  }

  protected performSearch(): void {
    const term = this.searchTerm().trim();
    if (!term) {
      // If no search term, show recent tests
      this.hasSearched.set(false);
      this.loadRecentTests();
      return;
    }

    // Clear any existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.isSearching.set(true);
    this.searchError.set('');
    this.testResults.set([]);
    this.hasSearched.set(true);

    const params = new HttpParams()
      .set('page', '1')
      .set('limit', '15')
      .set('identifier', term);

    this.apiService.getDiagnostics(params).subscribe({
      next: (response) => {
        this.isSearching.set(false);
        if (response.data && response.data.length > 0) {
          this.testResults.set(response.data);
        } else {
          this.searchError.set(`No diagnostic reports found for "${term}"`);
        }
      },
      error: (error) => {
        this.isSearching.set(false);
        console.error('Search error:', error);
        if (error.status === 404) {
          this.searchError.set(`No diagnostic reports found for "${term}"`);
        } else if (error.status === 403) {
          this.searchError.set('You do not have permission to search diagnostic reports.');
        } else {
          this.searchError.set('An error occurred while searching. Please try again.');
        }
      }
    });
  }

  protected performSearchDebounced(): void {
    // Clear any existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Set a new timeout
    this.searchTimeout = setTimeout(() => {
      this.performSearch();
    }, 300);
  }

  protected isDownloadingForId(id: number): boolean {
    return this.isDownloadingMap()[id] || false;
  }

  protected async downloadReport(row: Diagnostic): Promise<void> {
    const id = row.id;
    // Set loading state only for this diagnostic ID
    this.isDownloadingMap.update(map => ({ ...map, [id]: true }));
    
    try {
      console.log('Starting high-quality PDF generation for diagnostic:', row.id);
      
      // Use the shared diagnostic PDF service that renders the exact report component layout
      const blob = await this.diagnosticPdfService.generatePdf(row.id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename using the diagnostic data
      const diagnosticResponse = await firstValueFrom(this.apiService.getPublicDiagnostic(row.id));
      const filename = diagnosticResponse?.data ? 
        this.diagnosticPdfService.generateFilename(diagnosticResponse.data) : 
        `diagnostic_report_${row.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup blob URL
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      
      console.log('High-quality PDF generated successfully from dashboard using shared service');
      
    } catch (error) {
      console.error('Error generating PDF from dashboard:', error);
      // Fallback to opening report page in new tab
      console.log('Falling back to opening report page in new tab');
      window.open(`${window.location.origin}/diagnostics/report/${row.id}`, '_blank');
    } finally {
      // Reset loading state for this diagnostic ID
      this.isDownloadingMap.update(map => {
        const newMap = {...map};
        delete newMap[id];
        return newMap;
      });
    }
  }





  protected getResultStatus(row: Diagnostic): string {
    if (row.failed_components && row.failed_components.trim()) {
      return 'Failed';
    } else if (row.pending_components && row.pending_components.trim()) {
      return 'Pending';
    } else {
      return 'Passed';
    }
  }

  protected getStatusBadgeClass(row: Diagnostic): string {
    const status = this.getResultStatus(row);
    switch (status) {
      case 'Failed': return 'badge badge-error badge-sm';
      case 'Pending': return 'badge badge-warning badge-sm';
      case 'Passed': return 'badge badge-success badge-sm';
      default: return 'badge badge-neutral badge-sm';
    }
  }

  protected clearSearch(): void {
    this.searchTerm.set('');
    this.searchError.set('');
    this.hasSearched.set(false);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    // Load recent tests when clearing search
    this.loadRecentTests();
  }

  protected viewReport(row: Diagnostic): void {
    const encodedId = this.cipherService.encodeTestId(row.id, row.serial_number || undefined);
    this.router.navigate(['/diagnostics/report', encodedId]);
  }

  protected downloadDashboard(): void {
    // Use browser's native print functionality for dashboard export
    // This avoids document.write() issues and provides better compatibility
    try {
      // Temporarily add print-specific styles
      const printStyles = document.createElement('style');
      printStyles.textContent = `
        @media print {
          body * { visibility: hidden; }
          .dashboard-print-area, .dashboard-print-area * { visibility: visible; }
          .dashboard-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .btn, .loading, .no-print { display: none !important; }
          .card { break-inside: avoid; }
          .chart-container { height: 300px !important; }
        }
      `;
      document.head.appendChild(printStyles);
      
      // Add print class to main content area
      const dashboardElement = document.querySelector('.min-h-screen.bg-base-200');
      if (dashboardElement) {
        dashboardElement.classList.add('dashboard-print-area');
      }
      
      // Trigger print dialog
      window.print();
      
      // Cleanup after print dialog closes
      setTimeout(() => {
        document.head.removeChild(printStyles);
        if (dashboardElement) {
          dashboardElement.classList.remove('dashboard-print-area');
        }
      }, 100);
      
      console.log('Dashboard print dialog opened');
    } catch (error) {
      console.error('Error opening dashboard print dialog:', error);
      // Fallback: show message to user
      alert('Please use your browser\'s print function (Ctrl+P or Cmd+P) to export the dashboard.');
    }
  }
}

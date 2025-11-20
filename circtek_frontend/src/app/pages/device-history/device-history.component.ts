import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { LucideAngularModule, Skull, Wrench, CheckCircle, Download, Upload, Scale, FlaskConical, Package, Table2, Calendar, XCircle, Search, RotateCcw, Trash2 } from 'lucide-angular';
import { ApiService } from '../../core/services/api.service';
import { DeviceEvent } from '../../core/models/device-event';
import { BarcodeScannerComponent, ScanResult } from '../../shared/components/barcode-scanner/barcode-scanner.component';
import { AuthService } from '../../core/services/auth.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { Tenant } from '../../core/models/tenant';

@Component({
  selector: 'app-device-history',
  imports: [CommonModule, FormsModule, BarcodeScannerComponent, LucideAngularModule, CurrencyPipe],
  templateUrl: './device-history.component.html',
  styleUrl: './device-history.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceHistoryComponent {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);

  // Lucide icons
  protected readonly SkullIcon = Skull;
  protected readonly WrenchIcon = Wrench;
  protected readonly CheckCircleIcon = CheckCircle;
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;
  protected readonly ScaleIcon = Scale;
  protected readonly FlaskConicalIcon = FlaskConical;
  protected readonly PackageIcon = Package;
  protected readonly Table2Icon = Table2;
  protected readonly CalendarIcon = Calendar;
  protected readonly XCircleIcon = XCircle;
  protected readonly SearchIcon = Search;
  protected readonly RotateCcwIcon = RotateCcw;
  protected readonly Trash2Icon = Trash2;

  // State signals
  protected readonly loading = signal<boolean>(false);
  protected readonly events = signal<DeviceEvent[]>([]);
  protected readonly searchValue = signal<string>('');
  protected readonly viewMode = signal<'timeline' | 'table'>('timeline');
  protected readonly errorMessage = signal<string>('');
  protected readonly tenantError = signal<string>('');

  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly tenantLoading = signal<boolean>(false);
  protected readonly selectedTenantId = signal<number | null>(null);
  private readonly tenantsRequested = signal<boolean>(false);

  // Computed properties
  protected readonly isSuperAdmin = computed(() => this.authService.currentUser()?.role_id === 1);
  protected readonly hasEvents = computed(() => this.events().length > 0);
  protected readonly hasSearched = computed(() => this.searchValue().trim().length > 0);
  protected readonly timelineEvents = computed(() => {
    // Timeline should show latest events at the top
    // Backend returns events in desc order (latest first), so we use as-is
    return this.events();
  });
  protected readonly isSearchDisabled = computed(() => {
    if (this.loading()) return true;
    if (!this.searchValue().trim()) return true;
    if (this.isSuperAdmin() && this.tenantLoading()) return true;
    if (this.isSuperAdmin() && !this.selectedTenantId()) return true;
    return false;
  });

  constructor() {
    effect(() => {
      if (!this.isSuperAdmin()) {
        if (this.selectedTenantId() !== null) {
          this.selectedTenantId.set(null);
        }
        return;
      }

      if (this.tenantsRequested()) return;

      this.tenantsRequested.set(true);
      this.tenantLoading.set(true);
      this.apiService.getTenants(new HttpParams().set('limit', '1000')).subscribe({
        next: res => {
          const fetchedTenants = res.data ?? [];
          this.tenants.set(fetchedTenants);
          if (fetchedTenants.length > 0 && !this.selectedTenantId()) {
            this.selectedTenantId.set(fetchedTenants[0].id);
          }
          this.tenantError.set('');
        },
        error: err => {
          console.error('Failed to load tenants:', err);
          this.tenantError.set('Failed to load tenants. Please refresh and try again.');
          this.tenantLoading.set(false);
        },
        complete: () => {
          this.tenantLoading.set(false);
        }
      });
    });
  }

  // Event type labels and icons
  protected readonly eventTypeConfig = {
    'DEAD_IMEI': { label: 'Dead IMEI', icon: Skull, color: 'text-red-600', bgColor: 'bg-gradient-to-br from-red-500 to-red-600', ringColor: 'ring-red-200' },
    'REPAIR_STARTED': { label: 'Repair Started', icon: Wrench, color: 'text-blue-600', bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600', ringColor: 'ring-blue-200' },
    'REPAIR_COMPLETED': { label: 'Repair Completed', icon: CheckCircle, color: 'text-primary', bgColor: 'bg-gradient-to-br from-primary to-primary', ringColor: 'ring-primary/30' },
    'REPAIR_DELETED': { label: 'Repair Deleted', icon: Trash2, color: 'text-rose-600', bgColor: 'bg-gradient-to-br from-rose-500 to-rose-600', ringColor: 'ring-rose-200' },
    'TRANSFER_IN': { label: 'Transfer In', icon: Download, color: 'text-purple-600', bgColor: 'bg-gradient-to-br from-purple-500 to-purple-600', ringColor: 'ring-purple-200' },
    'TRANSFER_OUT': { label: 'Transfer Out', icon: Upload, color: 'text-orange-600', bgColor: 'bg-gradient-to-br from-orange-500 to-orange-600', ringColor: 'ring-orange-200' },
    'ADJUSTMENT': { label: 'Adjustment', icon: Scale, color: 'text-yellow-600', bgColor: 'bg-gradient-to-br from-yellow-500 to-yellow-600', ringColor: 'ring-yellow-200' },
    'TEST_COMPLETED': { label: 'Test Completed', icon: FlaskConical, color: 'text-indigo-600', bgColor: 'bg-gradient-to-br from-indigo-500 to-indigo-600', ringColor: 'ring-indigo-200' },
  };

  protected onSearchSubmit() {
    const value = this.searchValue().trim();
    if (!value) {
      this.errorMessage.set('Please enter an IMEI or Serial number');
      return;
    }
    this.searchDeviceHistory(value);
  }

  protected onBarcodeScanned(result: ScanResult) {
    this.searchValue.set(result.value);
    this.searchDeviceHistory(result.value);
  }

  protected onInputChanged(value: string) {
    this.searchValue.set(value);
  }

  protected onTenantSelected(value: unknown) {
    if (value === null || value === undefined || value === '') {
      this.selectedTenantId.set(null);
    } else {
      const parsed = typeof value === 'number' ? value : Number(value);
      this.selectedTenantId.set(Number.isFinite(parsed) ? parsed : null);
    }
    this.tenantError.set('');
  }

  protected toggleViewMode() {
    this.viewMode.update(mode => mode === 'timeline' ? 'table' : 'timeline');
  }

  protected clearSearch() {
    this.searchValue.set('');
    this.events.set([]);
    this.errorMessage.set('');
    this.tenantError.set('');
  }

  protected getEventConfig(eventType: string) {
    return this.eventTypeConfig[eventType as keyof typeof this.eventTypeConfig] || {
      label: eventType,
      icon: Calendar,
      color: 'text-gray-600',
      bgColor: 'bg-gradient-to-br from-gray-500 to-gray-600',
      ringColor: 'ring-gray-200'
    };
  }

  protected formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${month} ${day} ${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
  }

  protected formatDetails(details: any): string {
    if (!details) return '';
    if (typeof details === 'string') return details;
    if (typeof details === 'object') {
      // Filter out technical fields that users don't need to see
      const excludedKeys = ['id', 'action', 'warehouse_id', 'warehouse_name', 'tester_username', 
                           'actor_name', 'grade_name', 'grade_color', 'grade_id', 'repair_id', 
                           'repair_items_count', 'consumed_skus', 'consumed_items', 
                           'total_quantity_consumed', 'items_quantity', 'repairer_name', 'items_count',
                           'failed_components', 'passed_components', 'pending_components',
                           'test_result_id', 'imei', 'serial_number', 'deleted_at', 'total_quantity_restored', 'total_cost'];
      
      const filteredEntries = Object.entries(details)
        .filter(([key]) => !excludedKeys.includes(key))
        .filter(([_, value]) => value !== null && value !== undefined && value !== '');
      
      if (filteredEntries.length === 0) return '';
      
      return filteredEntries
        .map(([key, value]) => {
          // Format the key to be more readable
          const formattedKey = key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          // Handle battery_info object
          let displayValue = value;
          if (key === 'battery_info' && typeof value === 'object' && value !== null) {
            displayValue = (value as any).health_percentage ? `${(value as any).health_percentage}%` : value;
          }
          
          return `${formattedKey}: ${displayValue}`;
        })
        .join(' • ');
    }
    return String(details);
  }

  protected getDetailsList(details: any): Array<{key: string, value: string}> {
    if (!details || typeof details !== 'object') return [];
    
    const excludedKeys = ['id', 'action', 'warehouse_id', 'warehouse_name', 'tester_username', 
                          'actor_name', 'grade_name', 'grade_color', 'grade_id', 'remarks', 
                          'repair_id', 'repair_items_count', 'consumed_skus', 'consumed_items', 
                          'total_quantity_consumed', 'items_quantity', 'repairer_name', 'items_count',
                          'failed_components', 'passed_components', 'pending_components',
                          'test_result_id', 'imei', 'serial_number', 'deleted_at', 'total_quantity_restored', 'total_cost'];
    
    return Object.entries(details)
      .filter(([key]) => !excludedKeys.includes(key))
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => {
        // Handle battery_info object
        let displayValue = value;
        if (key === 'battery_info' && typeof value === 'object' && value !== null) {
          displayValue = (value as any).health_percentage ? `${(value as any).health_percentage}%` : (value as any).healthPercentage;
        }
        
        return {
          key: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          value: String(displayValue)
        };
      });
  }

  protected formatTestCompletedDetails(event: DeviceEvent): string {
    if (event.event_type !== 'TEST_COMPLETED' || !event.details) return '';
    
    const details = event.details as any;
    const warehouseName = details.warehouse_name || 'N/A';
    const testerName = details.tester_username || 'N/A';
    
    const basicDetails = Object.entries(details)
      .filter(([key]) => key !== 'warehouse_name' && key !== 'tester_username')
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return `${basicDetails}${basicDetails ? ', ' : ''}Warehouse: ${warehouseName}, Tester: ${testerName}`;
  }

  protected getWarehouseName(event: DeviceEvent): string {
    if (event.details && (event.details as any).warehouse_name) {
      return (event.details as any).warehouse_name;
    }
    return 'N/A';
  }

  protected getTesterName(event: DeviceEvent): string {
    if (event.event_type === 'TEST_COMPLETED' && event.details && (event.details as any).tester_username) {
      return (event.details as any).tester_username;
    }
    return 'N/A';
  }

  protected isStockInEvent(event: DeviceEvent): boolean {
    return event.event_type === 'TEST_COMPLETED' && 
           event.details && 
           (event.details as any).action === 'stock_in';
  }

  protected getStockInEventConfig(event: DeviceEvent) {
    if (this.isStockInEvent(event)) {
      return {
        label: 'Stock In',
        icon: Package,
        color: 'text-primary',
        bgColor: 'bg-gradient-to-br from-primary to-primary',
        ringColor: 'ring-primary/30'
      };
    }
    return this.getEventConfig(event.event_type);
  }

  protected getGradeName(event: DeviceEvent): string {
    if (this.isStockInEvent(event) && event.details && (event.details as any).grade_name) {
      return (event.details as any).grade_name;
    }
    return 'N/A';
  }

  protected getGradeColor(event: DeviceEvent): string {
    if (this.isStockInEvent(event) && event.details && (event.details as any).grade_color) {
      return (event.details as any).grade_color;
    }
    return '#6b7280';
  }

  protected getActorName(event: DeviceEvent): string {
    if (this.isStockInEvent(event) && event.details && (event.details as any).actor_name) {
      return (event.details as any).actor_name;
    }
    return 'N/A';
  }

  protected getStockInRemarks(event: DeviceEvent): string {
    if (this.isStockInEvent(event) && event.details && (event.details as any).remarks) {
      return (event.details as any).remarks;
    }
    return '';
  }

  protected getConsumedItems(event: DeviceEvent): Array<{sku: string, quantity: number, reason: string, cost: number, description?: string}> {
    if (event.event_type === 'REPAIR_COMPLETED' && event.details && (event.details as any).consumed_items) {
      const items = (event.details as any).consumed_items;
      // Handle both formats: {sku, ...} and {part_sku, ...}
      return items.map((item: any) => ({
        sku: item.sku || item.part_sku || 'fixed_price',
        quantity: item.quantity || 1,
        reason: item.reason || 'Unknown',
        cost: Number(item.cost || 0),
        description: item.description
      }));
    }
    return [];
  }

  protected hasConsumedItems(event: DeviceEvent): boolean {
    return this.getConsumedItems(event).length > 0;
  }

  protected getFailedComponents(event: DeviceEvent): string[] {
    if (event.event_type === 'TEST_COMPLETED' && event.details && (event.details as any).failed_components) {
      const failed = (event.details as any).failed_components;
      if (typeof failed === 'string') {
        return failed.split(',').map(c => c.trim()).filter(c => c.length > 0);
      }
      if (Array.isArray(failed)) {
        return failed;
      }
    }
    return [];
  }

  protected hasFailedComponents(event: DeviceEvent): boolean {
    return this.getFailedComponents(event).length > 0;
  }

  protected getBatteryInfo(event: DeviceEvent): any {
    if (event.event_type === 'TEST_COMPLETED' && event.details && (event.details as any).battery_info) {
      return (event.details as any).battery_info;
    }
    return null;
  }

  protected getRepairerName(event: DeviceEvent): string {
    if ((event.event_type === 'REPAIR_COMPLETED' || event.event_type === 'REPAIR_DELETED') && event.details && (event.details as any).repairer_name) {
      return (event.details as any).repairer_name;
    }
    return 'N/A';
  }

  protected getDeletedRepairItems(event: DeviceEvent): Array<{sku: string, quantity: number, reason: string, cost: number}> {
    if (event.event_type === 'REPAIR_DELETED' && event.details && (event.details as any).consumed_items) {
      const items = (event.details as any).consumed_items;
      return items.map((item: any) => ({
        sku: item.sku || 'fixed_price',
        quantity: item.quantity || 1,
        reason: item.reason || 'Unknown',
        cost: Number(item.cost || 0)
      }));
    }
    return [];
  }

  protected hasDeletedRepairItems(event: DeviceEvent): boolean {
    return this.getDeletedRepairItems(event).length > 0;
  }

  protected getDeletedAt(event: DeviceEvent): string {
    if (event.event_type === 'REPAIR_DELETED' && event.details && (event.details as any).deleted_at) {
      return this.formatDate((event.details as any).deleted_at);
    }
    return 'N/A';
  }

  protected getTotalQuantityRestored(event: DeviceEvent): number {
    if (event.event_type === 'REPAIR_DELETED' && event.details && (event.details as any).total_quantity_restored) {
      return (event.details as any).total_quantity_restored;
    }
    return 0;
  }

  protected getTotalCost(event: DeviceEvent): number {
    if (event.event_type === 'REPAIR_DELETED' && event.details && (event.details as any).total_cost) {
      return (event.details as any).total_cost;
    }
    return 0;
  }

  private searchDeviceHistory(identifier: string) {
    if (this.isSuperAdmin() && !this.selectedTenantId()) {
      this.tenantError.set('Please select a tenant before searching.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.tenantError.set('');
    
    // Determine if it's IMEI (15 digits) or serial number
    let params = new HttpParams();
    if (/^\d{15}$/.test(identifier)) {
      params = params.set('imei', identifier);
    } else {
      params = params.set('serial', identifier);
    }

    if (this.isSuperAdmin() && this.selectedTenantId()) {
      params = params.set('tenant_id', String(this.selectedTenantId()));
    }

    this.apiService.getDeviceEvents(params).subscribe({
      next: (response) => {
        this.events.set(response.data || []);
        this.loading.set(false);
        if (!response.data || response.data.length === 0) {
          this.errorMessage.set('No events found for this device');
        }
      },
      error: (error) => {
        console.error('Failed to fetch device events:', error);
        this.errorMessage.set('Failed to fetch device history. Please try again.');
        this.events.set([]);
        this.loading.set(false);
      }
    });
  }
}

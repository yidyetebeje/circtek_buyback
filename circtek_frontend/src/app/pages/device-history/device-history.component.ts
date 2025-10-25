import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { LucideAngularModule, Skull, Wrench, CheckCircle, Download, Upload, Scale, FlaskConical, Package, Table2, Calendar, XCircle, Search, RotateCcw } from 'lucide-angular';
import { ApiService } from '../../core/services/api.service';
import { DeviceEvent } from '../../core/models/device-event';
import { BarcodeScannerComponent, ScanResult } from '../../shared/components/barcode-scanner/barcode-scanner.component';

@Component({
  selector: 'app-device-history',
  imports: [CommonModule, FormsModule, BarcodeScannerComponent, LucideAngularModule],
  templateUrl: './device-history.component.html',
  styleUrl: './device-history.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceHistoryComponent {
  private readonly apiService = inject(ApiService);

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

  // State signals
  protected readonly loading = signal<boolean>(false);
  protected readonly events = signal<DeviceEvent[]>([]);
  protected readonly searchValue = signal<string>('');
  protected readonly viewMode = signal<'timeline' | 'table'>('timeline');
  protected readonly errorMessage = signal<string>('');

  // Computed properties
  protected readonly hasEvents = computed(() => this.events().length > 0);
  protected readonly hasSearched = computed(() => this.searchValue().trim().length > 0);

  // Event type labels and icons
  protected readonly eventTypeConfig = {
    'DEAD_IMEI': { label: 'Dead IMEI', icon: Skull, color: 'text-red-600', bgColor: 'bg-gradient-to-br from-red-500 to-red-600', ringColor: 'ring-red-200' },
    'REPAIR_STARTED': { label: 'Repair Started', icon: Wrench, color: 'text-blue-600', bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600', ringColor: 'ring-blue-200' },
    'REPAIR_COMPLETED': { label: 'Repair Completed', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-gradient-to-br from-green-500 to-green-600', ringColor: 'ring-green-200' },
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

  protected toggleViewMode() {
    this.viewMode.update(mode => mode === 'timeline' ? 'table' : 'timeline');
  }

  protected clearSearch() {
    this.searchValue.set('');
    this.events.set([]);
    this.errorMessage.set('');
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
    return new Date(dateString).toLocaleString();
  }

  protected formatDetails(details: any): string {
    if (!details) return '';
    if (typeof details === 'string') return details;
    if (typeof details === 'object') {
      // Filter out technical fields that users don't need to see
      const excludedKeys = ['id', 'action', 'warehouse_id', 'warehouse_name', 'tester_username', 
                            'actor_name', 'grade_name', 'grade_color', 'grade_id', 'repair_id', 
                            'repair_items_count', 'consumed_skus', 'consumed_items', 
                            'total_quantity_consumed', 'items_quantity', 'repairer_username',
                            'battery_info', 'failed_components', 'passed_components', 'pending_components'];
      
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
          return `${formattedKey}: ${value}`;
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
                          'total_quantity_consumed', 'items_quantity', 'repairer_username',
                          'battery_info', 'failed_components', 'passed_components', 'pending_components'];
    
    return Object.entries(details)
      .filter(([key]) => !excludedKeys.includes(key))
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => ({
        key: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        value: String(value)
      }));
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
        color: 'text-emerald-600',
        bgColor: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
        ringColor: 'ring-emerald-200'
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

  protected getConsumedItems(event: DeviceEvent): Array<{sku: string, quantity: number, reason: string, cost: string, description?: string}> {
    if (event.event_type === 'REPAIR_COMPLETED' && event.details && (event.details as any).consumed_items) {
      const items = (event.details as any).consumed_items;
      // Handle both formats: {sku, ...} and {part_sku, ...}
      return items.map((item: any) => ({
        sku: item.sku || item.part_sku || 'fixed_price',
        quantity: item.quantity || 1,
        reason: item.reason || 'Unknown',
        cost: item.cost || '0',
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
    if (event.event_type === 'REPAIR_COMPLETED' && event.details && (event.details as any).repairer_username) {
      return (event.details as any).repairer_username;
    }
    return 'N/A';
  }

  private searchDeviceHistory(identifier: string) {
    this.loading.set(true);
    this.errorMessage.set('');
    
    // Determine if it's IMEI (15 digits) or serial number
    let params = new HttpParams();
    if (/^\d{15}$/.test(identifier)) {
      params = params.set('imei', identifier);
    } else {
      params = params.set('serial', identifier);
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

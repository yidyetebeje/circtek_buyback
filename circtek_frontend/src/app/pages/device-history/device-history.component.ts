import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { DeviceEvent } from '../../core/models/device-event';
import { BarcodeScannerComponent, ScanResult } from '../../shared/components/barcode-scanner/barcode-scanner.component';

@Component({
  selector: 'app-device-history',
  imports: [CommonModule, FormsModule, BarcodeScannerComponent],
  templateUrl: './device-history.component.html',
  styleUrl: './device-history.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceHistoryComponent {
  private readonly apiService = inject(ApiService);

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
    'DEAD_IMEI': { label: 'Dead IMEI', icon: '💀', color: 'text-red-600', bgColor: 'bg-red-50' },
    'REPAIR_STARTED': { label: 'Repair Started', icon: '🔧', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    'REPAIR_COMPLETED': { label: 'Repair Completed', icon: '✅', color: 'text-green-600', bgColor: 'bg-green-50' },
    'TRANSFER_IN': { label: 'Transfer In', icon: '📥', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    'TRANSFER_OUT': { label: 'Transfer Out', icon: '📤', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    'ADJUSTMENT': { label: 'Adjustment', icon: '⚖️', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    'TEST_COMPLETED': { label: 'Test Completed', icon: '🧪', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
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
      icon: '📋',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
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
      return Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }
    return String(details);
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
    if (event.event_type === 'TEST_COMPLETED' && event.details && (event.details as any).warehouse_name) {
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

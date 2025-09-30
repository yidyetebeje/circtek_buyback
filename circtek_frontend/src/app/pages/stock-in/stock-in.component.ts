import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, RotateCcw, Save, Check } from 'lucide-angular';
import { StockInService, Device, Grade, Warehouse, StockInRequest, GradeHistoryRecord } from '../../services/stock-in.service';
import { BarcodeScannerComponent, ScanResult } from '../../shared/components/barcode-scanner/barcode-scanner.component';

@Component({
  selector: 'app-stock-in',
  imports: [CommonModule, FormsModule, BarcodeScannerComponent, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-base-100 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-base-content mb-2">Stock In Device</h1>
          <p class="text-base-content/70">Scan devices and assign grades for stock management</p>
        </div>

        <!-- Search Section -->
        <div class="bg-base-200 rounded-lg border border-base-300 p-6 mb-6">
          <div class="flex flex-col space-y-4">
            <!-- Search Input Row -->
            <div class="flex flex-col sm:flex-row gap-4">
              <div class="flex-1">
                <label for="search" class="block text-sm font-medium text-base-content mb-2">
                  Device Identifier (IMEI or Serial Number)
                </label>
                <app-barcode-scanner
                  placeholder="Scan or enter IMEI/Serial number..."
                  [enableCamera]="true"
                  [autoClear]="false"
                  (scanned)="onBarcodeScanned($event)"
                  (inputChanged)="onInputChanged($event)"
                />
              </div>
              <div class="flex gap-2 items-start" style="padding-top: 1.75rem;">
                <button
                  type="button"
                  (click)="onSearchSubmit()"
                  [disabled]="isSearching() || !searchValue().trim()"
                  class="btn btn-accent"
                >
                  @if (isSearching()) {
                    <span class="loading loading-spinner loading-sm"></span>
                  } @else {
                    <lucide-icon [img]="Search" class="size-4"></lucide-icon>
                  }
                  @if (isSearching()) {
                    Searching...
                  } @else {
                    Search
                  }
                </button>
              </div>
            </div>

            <!-- Error Message -->
            @if (searchError()) {
              <div class="alert alert-error">
                <span>⚠️</span>
                <span>{{ searchError() }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Device Found Section -->
        @if (selectedDevice() && !isSearching()) {
          <div class="bg-base-200 rounded-lg border border-base-300 mb-6">
            <!-- Device Info Header -->
            <div class="px-6 py-4 border-b border-base-300">
              <div class="flex justify-between items-center">
                <h2 class="text-xl font-semibold text-base-content">Device Found</h2>
                <button
                  type="button"
                  (click)="clearSearch()"
                  class="btn btn-ghost btn-sm"
                >
                  <lucide-icon [img]="RotateCcw" class="size-4"></lucide-icon>
                  New Search
                </button>
              </div>
            </div>

            <!-- Device Details -->
            <div class="p-6">
              <div class="bg-base-100 rounded-lg p-4 border border-base-300 mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-3">
                    <div>
                      <p class="text-xs font-medium text-base-content/70 mb-1">IMEI</p>
                      <p class="text-sm font-mono text-base-content">{{ selectedDevice()?.imei }}</p>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-base-content/70 mb-1">Serial Number</p>
                      <p class="text-sm font-mono text-base-content">{{ selectedDevice()?.serial || 'N/A' }}</p>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-base-content/70 mb-1">Make</p>
                      <p class="text-sm text-base-content font-medium">{{ selectedDevice()?.make }}</p>
                    </div>
                  </div>
                  <div class="space-y-3">
                    <div>
                      <p class="text-xs font-medium text-base-content/70 mb-1">Model</p>
                      <p class="text-sm text-base-content font-medium">{{ selectedDevice()?.model_name }}</p>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-base-content/70 mb-1">Device Type</p>
                      <p class="text-sm text-base-content">{{ selectedDevice()?.device_type }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Grade Selection -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold text-base-content mb-4">Select Grade</h3>
                @if (isLoadingGrades()) {
                  <div class="flex items-center justify-center py-8">
                    <span class="loading loading-spinner loading-md mr-2"></span>
                    <span>Loading grades...</span>
                  </div>
                } @else {
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                    @for (grade of grades(); track grade.id) {
                      <button
                        type="button"
                        class="grade-card relative p-5 rounded-xl border-2 transition-all duration-200 hover:scale-105 h-36 "
                        [class.selected]="selectedGradeId() === grade.id"
                        [style.background-color]="grade.color"
                        [style.border-color]="selectedGradeId() === grade.id ? '#1f2937' : 'transparent'"
                        [style.border-width.px]="selectedGradeId() === grade.id ? 3 : 2"
                        (click)="selectGrade(grade.id)"
                      >
                        @if (selectedGradeId() === grade.id) {
                          <div class="absolute top-2 right-2 bg-base-100/90 text-base-content rounded-full p-1 shadow">
                            <lucide-icon [img]="Check" class="size-4"></lucide-icon>
                          </div>
                        }
                        <div class="text-center">
                          <div class="text-white font-bold text-base drop-shadow-lg">
                            {{ grade.name }}
                          </div>
                        </div>
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Warehouse Selection -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold text-base-content mb-4">Select Warehouse</h3>
                <select 
                  class="select select-bordered w-full max-w-md"
                  [(ngModel)]="selectedWarehouseId"
                >
                  <option value="">Choose warehouse...</option>
                  @for (warehouse of warehouses(); track warehouse.id) {
                    <option [value]="warehouse.id">{{ warehouse.name }}</option>
                  }
                </select>
              </div>

              <!-- Remarks -->
              <div class="mb-6">
                <h3 class="text-lg font-semibold text-base-content mb-4">Remarks (Optional)</h3>
                <textarea
                  class="textarea textarea-bordered w-full"
                  [(ngModel)]="remarks"
                  placeholder="Enter any additional remarks or notes..."
                  rows="3"
                ></textarea>
              </div>

              <!-- Submit Button -->
              <div class="flex justify-end">
                <button 
                  type="submit"
                  class="btn btn-accent"
                  (click)="submitStockIn()"
                  [disabled]="!canSubmit() || isSubmitting()"
                >
                  @if (isSubmitting()) {
                    <span class="loading loading-spinner loading-sm"></span>
                  } @else {
                    <lucide-icon [img]="Save" class="size-4"></lucide-icon>
                  }
                  @if (isSubmitting()) {
                    Processing...
                  } @else {
                    Stock In Device
                  }
                </button>
              </div>

              <!-- Success/Error Messages -->
              @if (submitError()) {
                <div class="alert alert-error mt-4">
                  <span>❌</span>
                  <span>{{ submitError() }}</span>
                </div>
              }

              @if (submitSuccess()) {
                <div class="alert alert-success mt-4">
                  <span>✅</span>
                  <span>{{ submitSuccess() }}</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Initial State -->
        @if (!selectedDevice() && !isSearching()) {
          <div class="bg-base-200 rounded-lg border border-base-300 p-12 text-center">
            <div class="text-6xl mb-4">📦</div>
            <h3 class="text-lg font-medium text-base-content mb-2">Stock In Device</h3>
            <p class="text-base-content/70 max-w-md mx-auto">
              Scan or enter a device IMEI (15 digits) or Serial Number to begin the stock-in process.
              You'll be able to assign grades and track the device in your inventory.
            </p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .grade-card.selected {
      transform: scale(1.05);
      box-shadow: 0 8px 16px rgba(0,0,0,0.3);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockInComponent {
  private readonly stockInService = inject(StockInService);

  // State signals
  protected readonly isSearching = signal(false);
  protected readonly searchError = signal('');
  protected readonly searchValue = signal('');
  
  // Device state
  protected readonly selectedDevice = signal<Device | null>(null);

  // Grades state
  protected readonly grades = signal<Grade[]>([]);
  protected readonly isLoadingGrades = signal(false);
  protected readonly selectedGradeId = signal<number | null>(null);

  // Warehouses state
  protected readonly warehouses = signal<Warehouse[]>([]);
  protected readonly selectedWarehouseId = signal<number | null>(null);

  // Form state
  protected readonly remarks = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal('');
  protected readonly submitSuccess = signal('');

  // Computed properties
  protected readonly canSubmit = computed(() => {
    return this.selectedDevice() && 
           this.selectedGradeId() && 
           this.selectedWarehouseId() &&
           !this.isSubmitting();
  });

  // Icons
  protected readonly Search = Search;
  protected readonly RotateCcw = RotateCcw;
  protected readonly Save = Save;
  protected readonly Check = Check;

  constructor() {
    // Load initial data
    this.loadGrades();
    this.loadWarehouses();

    // Reset messages when device changes
    effect(() => {
      this.selectedDevice();
      this.submitSuccess.set('');
      this.submitError.set('');
    });
  }

  protected onBarcodeScanned(result: ScanResult) {
    this.searchValue.set(result.value);
    this.searchDevice(result.value);
  }

  protected onInputChanged(value: string) {
    this.searchValue.set(value);
  }

  protected onSearchSubmit() {
    const value = this.searchValue().trim();
    if (!value) {
      this.searchError.set('Please enter an IMEI or Serial number');
      return;
    }
    this.searchDevice(value);
  }

  protected clearSearch() {
    this.searchValue.set('');
    this.selectedDevice.set(null);
    this.selectedGradeId.set(null);
    this.selectedWarehouseId.set(null);
    this.remarks.set('');
    this.searchError.set('');
    this.submitError.set('');
    this.submitSuccess.set('');
  }

  protected selectGrade(gradeId: number) {
    this.selectedGradeId.set(gradeId);
  }

  protected submitStockIn() {
    if (!this.canSubmit()) return;

    const device = this.selectedDevice()!;
    const request: StockInRequest = {
      imei: device.imei,
      grade_id: this.selectedGradeId()!,
      warehouse_id: this.selectedWarehouseId()!,
      remarks: this.remarks().trim() || undefined
    };

    this.isSubmitting.set(true);
    this.submitError.set('');
    this.submitSuccess.set('');

    this.stockInService.stockInDevice(request).subscribe({
      next: (response) => {
        if (response.data) {
          this.submitSuccess.set(response.data.message);
          // Reset form after successful submission
          setTimeout(() => {
            this.clearSearch();
          }, 2000);
        } else {
          this.submitError.set(response.message || 'Failed to stock in device');
        }
        this.isSubmitting.set(false);
      },
      error: (error) => {
        console.error('Stock in failed:', error);
        this.submitError.set(error.error?.message || 'An error occurred while processing the request');
        this.isSubmitting.set(false);
      }
    });
  }

  private searchDevice(identifier: string) {
    this.isSearching.set(true);
    this.searchError.set('');
    this.selectedDevice.set(null);
    this.selectedGradeId.set(null);

    // Determine if it's IMEI (15 digits) or serial number
    const isIMEI = /^\d{15}$/.test(identifier);
    
    this.stockInService.searchDevices(
      isIMEI ? identifier : undefined,
      !isIMEI ? identifier : undefined
    ).subscribe({
      next: (response) => {
        if (response.data && response.data.length > 0) {
          const device = response.data[0];
          this.selectedDevice.set(device);
          this.selectedWarehouseId.set(device.warehouse_id);
        } else {
          this.searchError.set('Device not found with the provided IMEI or Serial number');
        }
        this.isSearching.set(false);
      },
      error: (error) => {
        console.error('Device search failed:', error);
        this.searchError.set('Failed to search device. Please try again.');
        this.isSearching.set(false);
      }
    });
  }

  private loadGrades() {
    this.isLoadingGrades.set(true);
    
    this.stockInService.getGrades().subscribe({
      next: (response) => {
        this.grades.set(response.data || []);
        this.isLoadingGrades.set(false);
      },
      error: (error) => {
        console.error('Failed to load grades:', error);
        this.isLoadingGrades.set(false);
      }
    });
  }

  private loadWarehouses() {
    this.stockInService.getWarehouses().subscribe({
      next: (response) => {
        this.warehouses.set(response.data || []);
      },
      error: (error) => {
        console.error('Failed to load warehouses:', error);
      }
    });
  }
}

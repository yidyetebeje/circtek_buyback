import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BarcodeScannerComponent, type ScanResult } from './barcode-scanner.component';

@Component({
  selector: 'app-barcode-scanner-example',
  imports: [CommonModule, BarcodeScannerComponent],
  template: `
    <div class="max-w-2xl mx-auto p-6 space-y-6">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Barcode Scanner Demo</h2>
          
          <!-- Basic Scanner -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">Basic Scanner</h3>
            <app-barcode-scanner
              label="Device IMEI/Serial"
              placeholder="Scan or enter device identifier..."
              [required]="true"
              (scanned)="onBasicScan($event)"
            />
          </div>
          
          <!-- Scanner with Auto-clear Disabled -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">Scanner (No Auto-clear)</h3>
            <app-barcode-scanner
              label="Persistent Scanner"
              placeholder="Value stays after scan..."
              [autoClear]="false"
              (scanned)="onPersistentScan($event)"
            />
          </div>
          
          <!-- Results Display -->
          @if (lastScanResult()) {
            <div class="alert" [class]="getAlertClass()">
              <div>
                <h4 class="font-bold">Last Scan Result:</h4>
                <p><strong>Value:</strong> {{ lastScanResult()?.value }}</p>
                <p><strong>Type:</strong> {{ lastScanResult()?.type?.toUpperCase() }}</p>
                <p><strong>Valid:</strong> {{ lastScanResult()?.isValid ? 'Yes' : 'No' }}</p>
              </div>
            </div>
          }
          
          <!-- Instructions -->
          <div class="bg-base-200 p-4 rounded-lg">
            <h4 class="font-semibold mb-2">How to use:</h4>
            <ul class="list-disc list-inside space-y-1 text-sm">
              <li><strong>Barcode Scanner:</strong> Simply scan with your barcode scanner device - it will auto-detect and populate</li>
              <li><strong>Manual Entry:</strong> Click in the input field and type manually</li>
              <li><strong>IMEI:</strong> Must be exactly 15 digits with valid checksum</li>
              <li><strong>Serial:</strong> 6-20 alphanumeric characters</li>
              <li><strong>Validation:</strong> Real-time validation with visual feedback</li>
            </ul>
          </div>
          
          <!-- Test Values -->
          <div class="bg-base-200 p-4 rounded-lg">
            <h4 class="font-semibold mb-2">Test Values:</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <strong>Valid IMEI:</strong>
                <code class="block bg-base-300 p-1 rounded">123456789012345</code>
              </div>
              <div>
                <strong>Valid Serial:</strong>
                <code class="block bg-base-300 p-1 rounded">ABC123XYZ</code>
              </div>
              <div>
                <strong>Invalid IMEI:</strong>
                <code class="block bg-base-300 p-1 rounded">123456789012346</code>
              </div>
              <div>
                <strong>Invalid Serial:</strong>
                <code class="block bg-base-300 p-1 rounded">AB1</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodeScannerExampleComponent {
  protected readonly lastScanResult = signal<ScanResult | null>(null);
  
  onBasicScan(result: ScanResult): void {
   
    this.lastScanResult.set(result);
  }
  
  onPersistentScan(result: ScanResult): void {
   
    this.lastScanResult.set(result);
  }
  
  protected getAlertClass(): string {
    const result = this.lastScanResult();
    if (!result) return 'alert-info';
    return result.isValid ? 'alert-success' : 'alert-error';
  }
}

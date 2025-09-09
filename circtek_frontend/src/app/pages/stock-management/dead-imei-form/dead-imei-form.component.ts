import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { GenericFormPageComponent, FormField } from '../../../shared/components/generic-form-page/generic-form-page.component';
import { BarcodeScannerComponent, ScanResult } from '../../../shared/components/barcode-scanner/barcode-scanner.component';
import { ApiService } from '../../../core/services/api.service';
import { DeadIMEICreateInput } from '../../../core/models/dead-imei';

@Component({
  selector: 'app-dead-imei-form',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent, BarcodeScannerComponent],
  templateUrl: './dead-imei-form.component.html',
  styleUrls: ['./dead-imei-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeadIMEIFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  // State
  protected readonly loading = signal(false);
  protected readonly error = signal<string>('');
  protected readonly deviceFound = signal<any>(null);

  // Form (no manual fields; submission relies on scanner result)
  protected readonly form: FormGroup = this.fb.group({});

  // No manual fields; only barcode scanner is used
  protected readonly formFields = computed<FormField[]>(() => []);

  constructor() {
    // No initialization needed for simplified form
  }

  protected onScan(result: ScanResult) {
    if (result.isValid) {
      this.lookupDevice(result.value);
    }
  }

  private lookupDevice(identifier: string) {
    this.api.findDeviceByImeiOrSerial(identifier).subscribe({
      next: (res) => {
        if (res.data) {
          this.deviceFound.set(res.data);
          this.error.set('');
        } else {
          this.deviceFound.set(null);
          this.error.set('Device not found with this identifier');
        }
      },
      error: (err) => {
        this.deviceFound.set(null);
        this.error.set('Error looking up device');
        console.error('Device lookup error:', err);
      }
    });
  }

  protected onSubmit() {
    const device = this.deviceFound();
    if (!device) {
      this.error.set('Please enter a valid device identifier');
      return;
    }

    const payload: DeadIMEICreateInput = {
      device_id: device.id,
      sku: device.sku,
      warehouse_id: device.warehouse_id || 1, // Use device's current warehouse or default
      actor_id: 1, // TODO: Get from auth service
    };

    this.loading.set(true);
    this.error.set('');

    this.api.createDeadIMEIWriteOff(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.status >= 200 && res.status < 300) {
          // Navigate back to stock management with dead-imei tab
          this.router.navigate(['/stock-management'], { 
            queryParams: { tab: 'dead-imei' } 
          });
        } else {
          this.error.set(res.message || 'Failed to create dead IMEI record');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Failed to create dead IMEI record');
        console.error('Create dead IMEI error:', err);
      }
    });
  }

  protected onCancel() {
    this.router.navigate(['/stock-management'], { 
      queryParams: { tab: 'dead-imei' } 
    });
  }
}

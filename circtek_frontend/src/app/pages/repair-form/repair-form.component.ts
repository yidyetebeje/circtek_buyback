import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';

import { GenericFormPageComponent, type FormField, type FormAction } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RepairCreateInput, RepairConsumeItemsInput, RepairCreateWithConsumeInput } from '../../core/models/repair';
import { BarcodeScannerComponent, ScanResult } from '../../shared/components/barcode-scanner/barcode-scanner.component';
import { SkuAutocompleteComponent } from '../../shared/components/sku-autocomplete/sku-autocomplete.component';
import { RepairReasonRecord } from '../../core/models/repair-reason';

@Component({
  selector: 'app-repair-form',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent, BarcodeScannerComponent, SkuAutocompleteComponent],
  templateUrl: './repair-form.component.html',
  styleUrls: ['./repair-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepairFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // State
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  isSkuScannerOpen = signal(false);
  isImeiScannerDisabled = signal(false);
  form = signal<FormGroup>(this.createForm());
  createForm() {
    return this.fb.group({
      device_id: [null as number | null],
      remarks: [''],
      identifier: ['', Validators.required],
      warehouse_id: [null as number | null, Validators.required],
      parts: this.fb.array([])
    });
  }
  // Form

  // Form configuration
  title = 'Create Repair';
  subtitle = 'Create a new repair record for a device';
  submitLabel = 'Create Repair';
  fields = computed<FormField[]>(() => []);
  actions = computed<FormAction[]>(() => [
   
    { 
      label: 'Cancel', 
      type: 'button', 
      variant: 'ghost' 
    },
    
  ]);

  // Computed form validation
  isFormValid = () => {
    const form = this.form();
    const hasParts = this.parts.length > 0;
    const allPartsValid = this.parts.controls.every(partGroup => partGroup.valid);
    
    // Check required fields manually
    const hasIdentifier = form.get('identifier')?.value?.trim();
    const hasWarehouseId = form.get('warehouse_id')?.value;
    const hasDeviceId = form.get('device_id')?.value;
    console.log({
      hasIdentifier,
      hasWarehouseId,
      hasDeviceId,
      hasParts,
      allPartsValid
    })
    
    return hasIdentifier && hasWarehouseId && hasDeviceId && hasParts && allPartsValid;
  };



  ngOnInit() {
    this.loadWarehouses();
    this.loadRepairReasons();
    
    // Add default part
    this.addPart();
    
    // Auto-fetch device details when identifier changes
    this.form().get('identifier')?.valueChanges.subscribe((identifier: string) => {
      if (identifier && identifier.trim().length > 0) {
        // Debounce the API call to avoid too many requests
        setTimeout(() => {
          if (this.form().get('identifier')?.value === identifier) {
            this.fetchDeviceDetails();
          }
        }, 500);
      }
    });
  }

  // Data for dropdowns
  warehouses = signal<Array<{ id: number; name: string }>>([]);
  repairReasons = signal<RepairReasonRecord[]>([]);
  deviceDetails = signal<any | null>(null);
  testResultsText = signal<string>('');
  failedComponents = signal<string[]>([]);
  now = signal<Date>(new Date());

  repairReasonOptions = computed(() => this.repairReasons().map(r => ({ label: r.name, value: r.id })));

  get parts(): FormArray {
    return this.form().get('parts') as FormArray;
  }

  get reasonControl(): FormControl<number | null> {
    return this.form().get('reason_id') as FormControl<number | null>;
  }

  get identifierControl(): FormControl<string | null> {
    return this.form().get('identifier') as FormControl<string | null>;
  }

  get remarksControl(): FormControl<string | null> {
    return this.form().get('remarks') as FormControl<string | null>;
  }

  addPart() {
    const partForm = this.fb.group({
      sku: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      reason_id: [null as number | null, [Validators.required, Validators.min(1)]],
      remarks: ['']
    });
    this.parts.push(partForm);
  }

  removePart(index: number) {
    this.parts.removeAt(index);
  }

  loadWarehouses() {
    this.api.getWarehouses().subscribe({ next: (res) => { this.warehouses.set((res as any)?.data ?? []); } });
  }

  loadRepairReasons() {
    this.api.getRepairReasons().subscribe({ 
      next: (res) => { this.repairReasons.set(res.data ?? []); },
      error: () => { this.repairReasons.set([]); }
    });
  }

  fetchDeviceDetails() {
    const identifier = this.form().get('identifier')?.value?.toString().trim();
    if (!identifier) return;
    this.loading.set(true);
    this.deviceDetails.set(null);
    this.testResultsText.set('');

    this.api.findDeviceByImeiOrSerial(identifier).subscribe({
      next: (res) => {
        const device = (res as any)?.data ?? null;
        this.deviceDetails.set(device);
        if (device) {

          console.log("device id", device);
          const deviceId = Number(device.id ?? device.device_id ?? 0);
          console.log("device id", deviceId);
          if (deviceId > 0) this.form().get('device_id')?.setValue(deviceId);
          console.log(this.form().value);
          const params = new HttpParams()
            .set('identifier', identifier)
            .set('page', '1')
            .set('limit', '10');
          this.api.getDiagnostics(params).subscribe({
            next: (diagRes) => {
              this.loading.set(false);
              const diagnostics = diagRes.data ?? [];
              if (diagnostics.length > 0) {
                const latest = diagnostics[0];
                const passed = this.parseComponents(latest.passed_components);
                const failed = this.parseComponents(latest.failed_components);
                const pending = this.parseComponents(latest.pending_components);

                this.failedComponents.set(failed);
                if (failed.length > 0) {
                  this.testResultsText.set(`Latest test: ${failed.length} failed${pending.length ? `; ${pending.length} pending` : ''}.`);
                } else {
                  this.testResultsText.set(`Latest test: All components passed${pending.length ? `; ${pending.length} pending` : ''}.`);
                }
              } else { this.testResultsText.set('No diagnostic history found.'); }
            },
            error: () => { this.loading.set(false); this.testResultsText.set('Could not fetch diagnostic history.'); }
          });
        } else {
          this.loading.set(false);
          this.error.set('Device not found for provided identifier');
          this.testResultsText.set('Device not found.');
        }
      },
      error: () => { this.loading.set(false); this.error.set('Device not found for provided identifier'); this.testResultsText.set('Device not found.'); }
    });
  }

  private parseComponents(input: unknown): string[] {
    if (!input) return [];
    if (Array.isArray(input)) {
      return input.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map(s => s.trim());
    }
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map(s => s.trim());
        }
      } catch {
        return trimmed.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
      return [];
    }
    return [];
  }

  openSkuScanner() { this.isSkuScannerOpen.set(true); }
  closeSkuScanner() { this.isSkuScannerOpen.set(false); }

  onImeiScanned(result: ScanResult) {
    if (result.isValid) {
      this.form().get('identifier')?.setValue(result.value);
      this.fetchDeviceDetails();
    }
  }

  onSkuScanned(result: ScanResult) {
    if (result.isValid) {
      this.parts.at(this.parts.length - 1)?.get('sku')?.setValue(result.value);
      this.closeSkuScanner();
    }
  }



  onSkuSelected(sku: string, index: number) {
    this.parts.at(index)?.get('sku')?.setValue(sku);
  }

  onSubmit() {
    console.log(this.form().value, "submitting");
    if (!this.isFormValid()) {
      this.error.set(this.getValidationErrorMessage());
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const formValue = this.form().value;
    const parts = this.parts.value;

    // Prepare the payload for the new endpoint
    const payload: RepairCreateWithConsumeInput = {
      device_id: formValue.device_id!,
      remarks: formValue.remarks || undefined,
      warehouse_id: formValue.warehouse_id!,
      items: parts.map((part: any) => ({
        sku: part.sku,
        quantity: part.quantity,
        reason_id: part.reason_id
      })),
      notes: undefined // Optional field
    };

    this.api.createRepairWithConsume(payload).subscribe({
      next: (response: any) => {
        this.submitting.set(false);
        if (response.status === 201) {
          // Success - navigate back to repairs list
          this.router.navigate(['/repair'], { 
            queryParams: { tab: 'repairs' } 
          });
        } else {
          this.error.set(response.message || 'Failed to create repair');
        }
      },
      error: (err: any) => {
        this.submitting.set(false);
        this.error.set(err.message || 'An error occurred while creating the repair');
      }
    });
  }

  onActionClick(event: { action: string; data?: any }) {
    console.log("event action", event.action)
    if (event.action === 'Cancel') { 
      this.onCancel(); 
    } else if (event.action === 'Create Repair') {
      this.onSubmit();
    }
  }

  onCancel() {
    this.router.navigate(['/repair'], { queryParams: { tab: 'repairs' } });
  }

  disableImeiScanner() {
    this.isImeiScannerDisabled.set(true);
  }

  enableImeiScanner() {
    this.isImeiScannerDisabled.set(false);
  }

  private getValidationErrorMessage(): string {
    const form = this.form();
    const missingFields: string[] = [];
    console.log(form, "validated form")
    
    if (!form.get('identifier')?.value?.trim()) {
      missingFields.push('Device IMEI/Serial');
    }
    if (!form.get('warehouse_id')?.value) {
      missingFields.push('Warehouse');
    }
    if (!form.get('device_id')?.value) {
      missingFields.push('Device Details (fetch device details first)');
    }
    
    // Check parts validation
    const partsErrors: string[] = [];
    if (this.parts.length === 0) {
      partsErrors.push('at least one part');
    } else {
      this.parts.controls.forEach((partGroup, index) => {
        const partErrors: string[] = [];
        if (!partGroup.get('sku')?.value?.trim()) {
          partErrors.push('SKU');
        }
        if (!partGroup.get('quantity')?.value || partGroup.get('quantity')?.value < 1) {
          partErrors.push('quantity');
        }
        if (!partGroup.get('reason_id')?.value) {
          partErrors.push('reason');
        }
        
        if (partErrors.length > 0) {
          partsErrors.push(`Part ${index + 1}: ${partErrors.join(', ')}`);
        }
      });
    }
    
    let errorMessage = '';
    if (missingFields.length > 0) {
      errorMessage += `Missing required fields: ${missingFields.join(', ')}`;
    }
    if (partsErrors.length > 0) {
      if (errorMessage) errorMessage += '. ';
      errorMessage += `Parts issues: ${partsErrors.join('; ')}`;
    }
    
    return errorMessage || 'Please fill in all required fields';
  }
}
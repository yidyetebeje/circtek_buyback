import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';

import { GenericFormPageComponent, type FormField, type FormAction } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { RepairCreateInput, RepairConsumeItemsInput, RepairCreateWithConsumeInput, RepairRecord } from '../../core/models/repair';
import { BarcodeScannerComponent, ScanResult } from '../../shared/components/barcode-scanner/barcode-scanner.component';
import { SkuAutocompleteComponent } from '../../shared/components/sku-autocomplete/sku-autocomplete.component';
import { RepairReasonAutocompleteComponent } from '../../shared/components/repair-reason-autocomplete/repair-reason-autocomplete.component';
import { RepairReasonRecord } from '../../core/models/repair-reason';

@Component({
  selector: 'app-repair-form',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent, BarcodeScannerComponent, SkuAutocompleteComponent, RepairReasonAutocompleteComponent],
  templateUrl: './repair-form.component.html',
  styleUrls: ['./repair-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepairFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  // View references
  private readonly imeiScanner = viewChild<BarcodeScannerComponent>('imeiScanner');

  // State
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  isSkuScannerOpen = signal(false);
  isImeiScannerDisabled = signal(false);
  deviceFound = signal(false);
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
    
    // Check basic required fields
    const hasIdentifier = form.get('identifier')?.value?.trim();
    const hasWarehouseId = form.get('warehouse_id')?.value;
    const hasDeviceId = form.get('device_id')?.value;
    const deviceFoundStatus = this.deviceFound();
    
    // If device is not found yet, don't validate parts
    if (!deviceFoundStatus) {
      return hasIdentifier && hasWarehouseId;
    }
    
    // If device is found, validate parts as well
    const hasParts = this.parts.length > 0;
    const allPartsValid = this.parts.controls.every(partGroup => {
      const sku: string = (partGroup.get('sku')?.value || '').toString().trim();
      const quantityValid = Number(partGroup.get('quantity')?.value) > 0;
      const reasonId: number | null | undefined = partGroup.get('reason_id')?.value;
      const hasReason = !!reasonId;

      // Valid if has quantity and reason (SKU is now optional for all reasons)
      return quantityValid && hasReason;
    });
    
    console.log({
      hasIdentifier,
      hasWarehouseId,
      hasDeviceId,
      deviceFoundStatus,
      hasParts,
      allPartsValid
    })
    
    return hasIdentifier && hasWarehouseId && hasDeviceId && hasParts && allPartsValid;
  };



  ngOnInit() {
    this.loadWarehouses();
    this.loadRepairReasons();
    this.setUserWarehouse();
    this.setupIdentifierSubscription();
  }

  setupIdentifierSubscription() {
    // Reset device found state when identifier is cleared
    this.form().get('identifier')?.valueChanges.subscribe((identifier: string) => {
      if (!identifier || identifier.trim().length === 0) {
        this.deviceFound.set(false);
        this.form().get('device_id')?.setValue(null);
        this.repairHistory.set([]);
      }
    });
  }

  setUserWarehouse() {
    const currentUser = this.auth.currentUser();
    if (currentUser?.warehouse_id) {
      this.form().get('warehouse_id')?.setValue(currentUser.warehouse_id);
    }
  }

  resetForm() {
    // Reset all state signals
    this.deviceFound.set(false);
    this.deviceDetails.set(null);
    this.testResultsText.set('');
    this.failedComponents.set([]);
    this.repairHistory.set([]);
    this.error.set(null);
    this.isImeiScannerDisabled.set(false);
    
    // Create a new form instance
    this.form.set(this.createForm());
    
    // Clear the IMEI scanner component
    const scanner = this.imeiScanner();
    if (scanner) {
      scanner.clear();
    }
    
    // Re-apply user's warehouse and setup subscriptions
    this.setUserWarehouse();
    this.setupIdentifierSubscription();
  }

  // Data for dropdowns
  warehouses = signal<Array<{ id: number; name: string }>>([]);
  repairReasons = signal<RepairReasonRecord[]>([]);
  deviceDetails = signal<any | null>(null);
  testResultsText = signal<string>('');
  failedComponents = signal<string[]>([]);
  repairHistory = signal<RepairRecord[]>([]);
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
      sku: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      reason_id: [null as number | null, [Validators.required, Validators.min(1)]],
      remarks: ['']
    });
    this.parts.push(partForm);
  }

  initializePartsWhenDeviceFound() {
    // Add initial part when device is found and parts array is empty
    if (this.parts.length === 0) {
      this.addPart();
    }
  }

  removePart(index: number) {
    this.parts.removeAt(index);
  }

  loadWarehouses() {
    this.api.getWarehouses().subscribe({ next: (res) => { this.warehouses.set((res as any)?.data ?? []); } });
  }

  loadRepairReasons() {
    const params = new HttpParams().set('limit', '500');
    this.api.getRepairReasons(params).subscribe({ 
      next: (res) => { this.repairReasons.set(res.data ?? []); },
      error: () => { this.repairReasons.set([]); }
    });
  }

  fetchRepairHistory(deviceId: number) {
    const params = new HttpParams()
      .set('device_id', deviceId.toString())
      .set('limit', '50');
    
    this.api.getRepairs(params).subscribe({
      next: (res) => {
        this.repairHistory.set(res.data ?? []);
      },
      error: () => {
        this.repairHistory.set([]);
      }
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
          this.deviceFound.set(true);
          this.initializePartsWhenDeviceFound();
          console.log("device id", device);
          const deviceId = Number(device.id ?? device.device_id ?? 0);
          console.log("device id", deviceId);
          if (deviceId > 0) this.form().get('device_id')?.setValue(deviceId);
          console.log(this.form().value);
          
          // Fetch repair history for this device
          this.fetchRepairHistory(deviceId);
          
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
          this.deviceFound.set(false);
          this.error.set('Device not found for provided identifier');
          this.testResultsText.set('Device not found.');
        }
      },
      error: () => { this.loading.set(false); this.deviceFound.set(false); this.error.set('Device not found for provided identifier'); this.testResultsText.set('Device not found.'); }
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

  onImeiInputChanged(value: string) {
    // Update the form control value in real-time as user types
    this.form().get('identifier')?.setValue(value);
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

  onItemTypeChange(index: number, isFixedPrice: boolean) {
    const partGroup = this.parts.at(index);
    if (!partGroup) return;

    partGroup.get('is_fixed_price')?.setValue(isFixedPrice);
    
    if (isFixedPrice) {
      // For fixed-price services, set SKU to the constant
      partGroup.get('sku')?.setValue('fixed_price');
    } else {
      // For parts, clear the SKU so user can select
      partGroup.get('sku')?.setValue('');
    }
  }

  isFixedPriceItem(index: number): boolean {
    return this.parts.at(index)?.get('is_fixed_price')?.value === true;
  }

  // Filter repair reasons that have fixed_price for fixed-price items
  getRepairReasonsForItem(index: number) {
    const isFixedPrice = this.isFixedPriceItem(index);
    if (isFixedPrice) {
      // Only show repair reasons that have a fixed_price
      return this.repairReasons()
        .filter(r => r.fixed_price != null && r.fixed_price > 0)
        .map(r => ({ label: `${r.name} ($${r.fixed_price})`, value: r.id }));
    }
    // Show all repair reasons for regular parts
    return this.repairReasonOptions();
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
      items: parts.map((part: any) => {
        const trimmedSku = (part.sku || '').toString().trim();
        const reasonIsFixed = this.isReasonFixedPrice(part.reason_id);
        return {
          sku: trimmedSku || (reasonIsFixed ? 'fixed_price' : ''),
          quantity: part.quantity,
          reason_id: part.reason_id,
          description: part.remarks || undefined
        };
      }),
      notes: undefined // Optional field
    };

    this.api.createRepairWithConsume(payload).subscribe({
      next: (response: any) => {
        this.submitting.set(false);
        if (response.status === 201) {
          this.toast.saveSuccess('Repair', 'created');
          // Reset form and stay on page for next repair
          this.resetForm();
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
    this.navigateBack();
  }

  onBackClick(): void {
    this.navigateBack();
  }

  private navigateBack(): void {
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
    const deviceFoundStatus = this.deviceFound();
    console.log(form, "validated form")
    
    if (!form.get('identifier')?.value?.trim()) {
      missingFields.push('Device IMEI/Serial');
    }
    if (!form.get('warehouse_id')?.value) {
      missingFields.push('Warehouse');
    }
    
    // If device is not found yet, only validate basic fields
    if (!deviceFoundStatus) {
      if (!form.get('identifier')?.value?.trim() || !form.get('warehouse_id')?.value) {
        return 'Please select a warehouse and enter device IMEI/Serial to search for the device';
      }
      return 'Device not found. Please verify the IMEI/Serial and try again';
    }
    
    if (!form.get('device_id')?.value) {
      missingFields.push('Device Details (fetch device details first)');
    }
    
    // Check parts validation only if device is found
    const partsErrors: string[] = [];
    if (this.parts.length === 0) {
      partsErrors.push('at least one part or service');
    } else {
      this.parts.controls.forEach((partGroup, index) => {
        const partErrors: string[] = [];
        const sku: string = (partGroup.get('sku')?.value || '').toString().trim();
        if (!partGroup.get('quantity')?.value || partGroup.get('quantity')?.value < 1) {
          partErrors.push('quantity');
        }
        if (!partGroup.get('reason_id')?.value) {
          partErrors.push('reason');
        }

        if (partErrors.length > 0) {
          partsErrors.push(`Item ${index + 1}: ${partErrors.join(', ')}`);
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

  private isReasonFixedPrice(reasonId: number | null | undefined): boolean {
    if (!reasonId) return false;
    const reason = this.repairReasons().find(r => r.id === reasonId);
    return !!reason && reason.fixed_price != null && Number(reason.fixed_price) > 0;
  }

  getFormattedSkus(consumedParts: string[] | undefined): string {
    if (!consumedParts || consumedParts.length === 0) {
      return '';
    }
    return consumedParts.map(sku => sku === 'fixed_price' ? 'Service' : sku).join(', ');
  }

  getFormattedReasons(repairReasons: string[] | undefined): string {
    if (!repairReasons || repairReasons.length === 0) {
      return '';
    }
    return repairReasons.join(', ');
  }
}
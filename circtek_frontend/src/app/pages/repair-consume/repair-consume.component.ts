import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';

import { GenericFormPageComponent, type FormField, type FormAction } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { RepairWithItems, RepairConsumeItemsInput, RepairConsumeResult } from '../../core/models/repair';

interface ConsumeItem {
  sku: string;
  quantity: number;
}

@Component({
  selector: 'app-repair-consume',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent],
  templateUrl: './repair-consume.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepairConsumeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // State
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  repairId = signal<number>(0);
  repair = signal<RepairWithItems | null>(null);
  warehouses = signal<Array<{ label: string; value: number }>>([]);

  // Form
  form = this.fb.group({
    warehouse_id: [0, [Validators.required, Validators.min(1)]],
    items: this.fb.array<FormGroup>([]),
    notes: [''],
    actor_id: [0, [Validators.required, Validators.min(1)]],
  });

  get itemsArray() {
    return this.form.get('items') as FormArray;
  }

  // Form configuration
  title = computed(() => `Consume Parts for Repair #${this.repairId()}`);
  subtitle = computed(() => {
    const r = this.repair();
    return r ? `Device ID: ${r.repair.device_id}` : 'Loading repair details...';
  });

  fields = computed<FormField[]>(() => [
    {
      key: 'warehouse_id',
      label: 'Warehouse',
      type: 'select',
      required: true,
      options: this.warehouses().map(w => ({ label: w.label, value: String(w.value) })),
      helpText: 'Select the warehouse to consume parts from'
    },
    {
      key: 'notes',
      label: 'Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Additional notes about parts consumption...',
      helpText: 'Optional notes about the parts being consumed'
    },
    {
      key: 'actor_id',
      label: 'Actor ID',
      type: 'number',
      required: true,
      placeholder: 'Enter your actor ID',
      helpText: 'Your user ID for tracking who performed this action'
    },
  ]);

  actions = computed<FormAction[]>(() => [
    {
      label: 'Cancel',
      type: 'button',
      variant: 'ghost'
    }
  ]);

  submitLabel = computed(() => 'Consume Parts');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.repairId.set(Number(id));
      this.loadRepairDetails();
      this.loadWarehouses();
    }
  }

  private loadRepairDetails() {
    this.loading.set(true);
    this.api.getRepair(this.repairId()).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.status === 200 && response.data) {
          this.repair.set(response.data);
        } else {
          this.error.set('Failed to load repair details');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to load repair details');
      }
    });
  }

  private loadWarehouses() {
    this.api.getWarehouses(new HttpParams().set('limit', '1000')).subscribe({
      next: (response) => {
        if (response.data) {
          const options = response.data.map(w => ({ 
            label: w.name, 
            value: w.id 
          }));
          this.warehouses.set(options);
        }
      },
      error: (err) => {
        console.error('Failed to load warehouses:', err);
      }
    });
  }

  addItem() {
    const itemGroup = this.fb.group({
      sku: ['', [Validators.required, Validators.minLength(1)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });
    this.itemsArray.push(itemGroup);
  }

  removeItem(index: number) {
    this.itemsArray.removeAt(index);
  }

  onSubmit() {
    if (this.form.invalid || this.itemsArray.length === 0) return;

    this.submitting.set(true);
    this.error.set(null);

    const formData = this.form.value;
    const items: ConsumeItem[] = this.itemsArray.value.map((item: any) => ({
      sku: item.sku,
      quantity: Number(item.quantity),
    }));

    const payload: RepairConsumeItemsInput = {
      warehouse_id: Number(formData.warehouse_id),
      items,
      notes: formData.notes || undefined,
      actor_id: Number(formData.actor_id),
    };

    this.api.consumeRepairItems(this.repairId(), payload).subscribe({
      next: (response) => {
        this.submitting.set(false);
        if (response.status === 200) {
          // Navigate back to stock management with repairs tab
          this.router.navigate(['/stock-management'], { 
            queryParams: { tab: 'repairs' } 
          });
        } else {
          this.error.set(response.message || 'Failed to consume parts');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.message || 'An error occurred while consuming parts');
      }
    });
  }

  onActionClick(event: { action: string; data?: any }) {
    if (event.action === 'Cancel') {
      this.onCancel();
    }
  }

  onCancel() {
    this.router.navigate(['/stock-management'], { 
      queryParams: { tab: 'repairs' } 
    });
  }
}

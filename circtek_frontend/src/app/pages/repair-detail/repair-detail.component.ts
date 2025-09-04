import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { GenericFormPageComponent, type FormField } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { RepairWithItems } from '../../core/models/repair';

@Component({
  selector: 'app-repair-detail',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent],
  templateUrl: './repair-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepairDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // State
  loading = signal(false);
  error = signal<string | null>(null);
  repairId = signal<number>(0);
  repair = signal<RepairWithItems | null>(null);

  // Form (required by GenericFormPageComponent)
  form = this.fb.group({});
  fields = computed<FormField[]>(() => []);

  // Form configuration
  title = computed(() => `Repair Details #${this.repairId()}`);
  subtitle = computed(() => {
    const r = this.repair();
    if (!r) return 'Loading repair details...';
    const device = `Device ID: ${r.repair.device_id}`;
    return `Device: ${device}`;
  });

  actions = computed(() => [
    {
      label: 'Back to Repairs',
      type: 'button' as const,
      variant: 'ghost' as const
    }
  ]);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.repairId.set(Number(id));
      this.loadRepairDetails();
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

  getDeviceProperty(repair: any, property: string): string | null {
    return repair[property] || null;
  }

  onActionClick(event: { action: string; data?: any }) {
    if (event.action === 'Back to Repairs') {
      this.router.navigate(['/stock-management'], { 
        queryParams: { tab: 'repairs' } 
      });
    }
  }
}

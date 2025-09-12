import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GenericFormPageComponent, type FormField, type FormAction } from '../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { RepairReasonRecord, RepairReasonCreateInput, RepairReasonUpdateInput } from '../../core/models/repair-reason';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-repair-reasons-form',
  imports: [CommonModule, ReactiveFormsModule, GenericFormPageComponent],
  template: `
    <app-generic-form-page
      [title]="title()"
      [subtitle]="subtitle()"
      [form]="form"
      [fields]="fields()"
      [actions]="actions()"
      [loading]="loading()"
      [submitting]="submitting()"
      [error]="error()"
      [submitLabel]="submitLabel()"
      (formSubmit)="onSubmit()"
      (actionClick)="onActionClick($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepairReasonsFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly toastr = inject(ToastrService);

  // Form state
  form: FormGroup;
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);

  // Mode detection
  isEditMode = computed(() => !!this.route.snapshot.params['id']);
  repairReasonId = computed(() => this.route.snapshot.params['id'] ? parseInt(this.route.snapshot.params['id']) : null);

  // UI labels
  title = computed(() => this.isEditMode() ? 'Edit Repair Reason' : 'Create Repair Reason');
  subtitle = computed(() => this.isEditMode() ? 'Update repair reason details' : 'Add a new repair reason to the system');
  submitLabel = computed(() => this.isEditMode() ? 'Update Repair Reason' : 'Create Repair Reason');

  // Form configuration
  fields = computed<FormField[]>(() => [
    {
      key: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      placeholder: 'Enter repair reason name',
      description: 'A descriptive name for the repair reason'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      placeholder: 'Enter detailed description (optional)',
      description: 'Additional details about this repair reason'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active', value: true },
        { label: 'Inactive', value: false }
      ],
      description: 'Whether this repair reason is currently active'
    }
  ]);

  actions = computed<FormAction[]>(() => [
    {
      label: 'Cancel',
      type: 'button',
      variant: 'ghost'
    }
  ]);

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      description: [''],
      status: [true, [Validators.required]]
    });

    // Load data if editing
    if (this.isEditMode()) {
      this.loadRepairReason();
    }
  }

  private loadRepairReason(): void {
    const id = this.repairReasonId();
    if (!id) return;

    this.loading.set(true);
    this.error.set(null);

    this.api.getRepairReason(id).subscribe({
      next: (response) => {
        if (response.data) {
          this.form.patchValue({
            name: response.data.name,
            description: response.data.description || '',
            status: response.data.status
          });
        } else {
          this.error.set('Repair reason not found');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load repair reason details');
        this.loading.set(false);
        console.error('Error loading repair reason:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const formData = this.form.value;
    const request = this.isEditMode() 
      ? this.updateRepairReason(formData)
      : this.createRepairReason(formData);

    request.subscribe({
      next: (response) => {
        if (response.data) {
          this.toast.saveSuccess('Repair Reason', this.isEditMode() ? 'updated' : 'created');
          this.router.navigate(['/repair'], { 
            queryParams: { tab: 'repair-reasons' } 
          });
        } else {
          this.error.set(response.message || 'Operation failed');
          this.toast.saveError('Repair Reason', this.isEditMode() ? 'update' : 'create');
        }
        this.submitting.set(false);
      },
      error: (err) => {
        this.error.set('Operation failed. Please try again.');
        this.submitting.set(false);
        console.error('Error submitting repair reason:', err);
        this.toast.saveError('Repair Reason', this.isEditMode() ? 'update' : 'create');
      }
    });
  }

  private createRepairReason(data: RepairReasonCreateInput) {
    return this.api.createRepairReason(data);
  }

  private updateRepairReason(data: RepairReasonUpdateInput) {
    const id = this.repairReasonId();
    if (!id) throw new Error('No repair reason ID for update');
    return this.api.updateRepairReason(id, data);
  }

  onActionClick(event: { action: string; data?: any }): void {
    if (event.action === 'Cancel') {
      this.router.navigate(['/repair'], { 
        queryParams: { tab: 'repair-reasons' } 
      });
    }
  }
}

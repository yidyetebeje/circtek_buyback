import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFormPageComponent, type FormField, type FormAction } from '../../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { HttpParams } from '@angular/common/http';

@Component({
  selector: 'app-label-template-form',
  imports: [CommonModule, GenericFormPageComponent, ReactiveFormsModule],
  templateUrl: './label-template-form.component.html',
  styleUrls: ['./label-template-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelTemplateFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  loading = signal(false);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  recordId = signal<number | null>(null);
  isEditMode = computed(() => this.recordId() !== null);

  tenantOptions = signal<Array<{ label: string; value: number }>>([]);
  isSuperAdmin = computed(() => this.auth.currentUser()?.role_id === 1);

  form = signal<FormGroup>(this.createForm());

  title = computed(() => (this.isEditMode() ? 'Edit Label Template' : 'Add Label Template'));
  subtitle = computed(() => (this.isEditMode() ? 'Update label template' : 'Create a new label template'));
  submitLabel = computed(() => (this.isEditMode() ? 'Update Label Template' : 'Create Label Template'));

  fields = computed<FormField[]>(() => {
    const base: FormField[] = [
      { key: 'name', label: 'Name', type: 'text', placeholder: 'Enter name', required: true, validation: { minLength: 2, maxLength: 100 } },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter description' },
      { key: 'canvas_state', label: 'Canvas JSON', type: 'textarea', placeholder: 'Paste canvas JSON', required: true },
      { key: 'status', label: 'Active', type: 'checkbox', placeholder: 'Active' },
    ];
    if (this.isSuperAdmin()) {
      base.splice(2, 0, { key: 'tenant_id', label: 'Tenant', type: 'select', required: true, options: this.tenantOptions() });
    }
    return base;
  });

  actions = computed<FormAction[]>(() => [
    { label: 'Cancel', type: 'button', variant: 'ghost' },
    { label: this.isEditMode() ? 'Update Label Template' : 'Create Label Template', type: 'submit', variant: 'primary' },
  ]);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !isNaN(Number(id))) this.recordId.set(Number(id));
    if (this.isSuperAdmin()) this.loadTenantOptions();
    effect(() => {
      const rid = this.recordId();
      if (rid) this.loadRecord(rid);
    });
  }

  private createForm(): FormGroup {
    const cfg: any = {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: [''],
      canvas_state: ['', [Validators.required]],
      status: [true],
    };
    if (this.isSuperAdmin()) cfg.tenant_id = [null, [Validators.required]];
    return this.fb.group(cfg);
  }

  private loadTenantOptions() {
    this.api.getTenants(new HttpParams().set('limit', '1000')).subscribe({
      next: (res) => {
        const options = (res.data ?? []).map(t => ({ label: t.name, value: t.id }));
        this.tenantOptions.set(options);
      },
      error: () => {},
    });
  }

  private loadRecord(id: number) {
    this.loading.set(true);
    this.api.getLabelTemplate(id).subscribe({
      next: (res) => {
        const r = (res as any)?.data ?? (res as any);
        const value: any = {
          name: r?.name ?? '',
          description: r?.description ?? '',
          canvas_state: r?.canvas_state ? JSON.stringify(r.canvas_state) : '',
          status: !!r?.status,
        };
        if (this.isSuperAdmin()) value.tenant_id = r?.tenant_id ?? null;
        this.form.set(this.createForm());
        this.form().patchValue(value);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.router.navigate(['/management'], { queryParams: { tab: 'labels' } }); },
    });
  }

  onFormSubmit(raw: any) {
    if (this.form().invalid) return;
    this.errorMessage.set(null);
    this.submitting.set(true);
    const payload: any = { ...raw };
    try { payload.canvas_state = JSON.parse(String(payload.canvas_state)); } catch { /* keep as string if invalid */ }
    if (!this.isSuperAdmin()) payload.tenant_id = this.auth.currentUser()?.tenant_id;
    if (this.isEditMode()) {
      this.api.updateLabelTemplate(this.recordId()!, payload).subscribe({
        next: () => { this.submitting.set(false); this.router.navigate(['/management'], { queryParams: { tab: 'labels' } }); },
        error: (err) => { this.errorMessage.set(err?.error?.message || err?.message || 'Failed to update'); this.submitting.set(false); },
      });
    } else {
      this.api.createLabelTemplate(payload).subscribe({
        next: () => { this.submitting.set(false); this.router.navigate(['/management'], { queryParams: { tab: 'labels' } }); },
        error: (err) => { this.errorMessage.set(err?.error?.message || err?.message || 'Failed to create'); this.submitting.set(false); },
      });
    }
  }

  onActionClick(event: { action: string; data?: any }) {
    if (event.action === 'Cancel') this.router.navigate(['/management'], { queryParams: { tab: 'labels' } });
  }
}



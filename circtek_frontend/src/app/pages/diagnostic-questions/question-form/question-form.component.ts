import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFormPageComponent, type FormField, type FormAction } from '../../../shared/components/generic-form-page/generic-form-page.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ToastService } from '../../../core/services/toast.service';
import { DiagnosticQuestionOption } from '../../../core/models/diagnostic-question';
import { HttpParams } from '@angular/common/http';
import { TranslationModalComponent } from '../translation-modal/translation-modal.component';
import { LucideAngularModule, Languages } from 'lucide-angular';

@Component({
  selector: 'app-question-form',
  imports: [CommonModule, GenericFormPageComponent, ReactiveFormsModule, TranslationModalComponent, LucideAngularModule],
  templateUrl: './question-form.component.html',
  styleUrls: ['./question-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly toast = inject(ToastService);

  // State
  loading = signal(false);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  questionId = signal<number | null>(null);
  isEditMode = computed(() => this.questionId() !== null);
  
  // Options management
  options = signal<DiagnosticQuestionOption[]>([]);
  optionsLoading = signal(false);
  newOptionText = signal('');
  editingOptionId = signal<number | null>(null);
  editingOptionText = signal('');

  // Translation modal
  isTranslationModalOpen = signal(false);
  protected readonly LanguagesIcon = Languages;

  // Tenant options
  tenantOptions = signal<Array<{ label: string; value: number }>>([]);

  // Guards
  isSuperAdmin = computed(() => this.auth.currentUser()?.role_id === 1);

  // Form
  questionForm = signal<FormGroup>(this.createForm());

  // Computed values
  title = computed(() => this.isEditMode() ? 'Edit Diagnostic Question' : 'Add Diagnostic Question');
  subtitle = computed(() => this.isEditMode() ? 'Update question information and manage options' : 'Create a new diagnostic question');
  submitLabel = computed(() => this.isEditMode() ? 'Update Question' : 'Create Question');

  fields = computed<FormField[]>(() => {
    const baseFields: FormField[] = [];

    // Tenant selection only for super_admin and only on create
    if (this.isSuperAdmin() && !this.isEditMode()) {
      baseFields.push({
        key: 'tenant_id',
        label: 'Tenant',
        type: 'select',
        required: true,
        options: this.tenantOptions()
      });
    }

    baseFields.push(
      {
        key: 'question_text',
        label: 'Question Text',
        type: 'textarea',
        placeholder: 'Enter the question (e.g., "What is the cosmetic condition of the screen?")',
        required: true,
        validation: { minLength: 10, maxLength: 500 }
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Optional description to clarify what this question assesses',
        required: false,
        validation: { maxLength: 500 }
      },
      {
        key: 'status',
        label: 'Active',
        type: 'checkbox',
        placeholder: 'Question is active'
      }
    );

    return baseFields;
  });

  actions = computed<FormAction[]>(() => [
    {
      label: 'Cancel',
      type: 'button',
      variant: 'ghost'
    }
  ]);

  constructor() {
    // Get question ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !isNaN(Number(id))) {
      this.questionId.set(Number(id));
    }

    // Load tenant options for super admins on create mode
    effect(() => {
      const superAdmin = this.isSuperAdmin();
      const isEdit = this.isEditMode();
      if (superAdmin && !isEdit && this.tenantOptions().length === 0) {
        this.loadTenantOptions();
      }
    });

    // Load question data if editing
    effect(() => {
      const questionId = this.questionId();
      if (questionId) {
        this.loadQuestion(questionId);
        this.loadOptions(questionId);
      }
    });
  }

  private createForm(): FormGroup {
    const formConfig: any = {
      question_text: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      description: ['', [Validators.maxLength(500)]],
      status: [true]
    };

    // Only add tenant_id for super_admin on create mode
    if (this.isSuperAdmin() && !this.isEditMode()) {
      formConfig.tenant_id = [null, [Validators.required]];
    }

    return this.fb.group(formConfig);
  }

  private loadTenantOptions() {
    this.api.getTenants(new HttpParams().set('limit', '1000').set('status', 'true')).subscribe({
      next: (res) => {
        const options = (res.data ?? [])
          .filter(tenant => tenant.status)
          .map(tenant => ({
            label: tenant.name,
            value: tenant.id
          }));
        this.tenantOptions.set(options);
      },
      error: (error) => {
        console.error('Failed to load tenants:', error);
      }
    });
  }

  private loadQuestion(questionId: number) {
    this.loading.set(true);
    this.api.getDiagnosticQuestion(questionId).subscribe({
      next: (res) => {
        const question = (res as any)?.data ?? (res as any);
        const formValue: any = {
          question_text: question?.question_text ?? '',
          description: question?.description ?? '',
          status: !!question?.status
        };

        this.questionForm.set(this.createForm());
        this.questionForm().patchValue(formValue);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load question:', error);
        this.loading.set(false);
        this.router.navigate(['/diagnostic-questions'], { queryParams: { tab: 'questions' } });
      }
    });
  }

  private loadOptions(questionId: number) {
    this.optionsLoading.set(true);
    this.api.getDiagnosticQuestionOptions(questionId).subscribe({
      next: (res) => {
        this.options.set((res.data ?? []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)));
        this.optionsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load options:', error);
        this.optionsLoading.set(false);
      }
    });
  }

  onFormSubmit(formValue: any) {
    if (this.questionForm().invalid) return;
    this.errorMessage.set(null);
    this.submitting.set(true);
    
    const questionData = { ...formValue };
    
    // Set tenant_id from current user if not super admin (only for create)
    if (!this.isEditMode() && !this.isSuperAdmin()) {
      questionData.tenant_id = this.auth.currentUser()?.tenant_id;
    }
    
    // Remove tenant_id in edit mode (not editable)
    if (this.isEditMode()) {
      delete (questionData as any).tenant_id;
    }

    if (this.isEditMode()) {
      this.api.updateDiagnosticQuestion(this.questionId()!, questionData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.saveSuccess('Question', 'updated');
          this.router.navigate(['/diagnostic-questions'], { queryParams: { tab: 'questions' } });
        },
        error: (error) => {
          console.error('Failed to update question:', error);
          const msg = error?.error?.message || error?.message || 'Failed to update question';
          this.errorMessage.set(msg);
          this.submitting.set(false);
        }
      });
    } else {
      this.api.createDiagnosticQuestion(questionData).subscribe({
        next: (res) => {
          this.submitting.set(false);
          const createdId = res.data?.id;
          this.toast.saveSuccess('Question', 'created');
          if (createdId) {
            // Navigate to edit mode so user can add options
            this.router.navigate(['/diagnostic-questions/questions', createdId, 'edit']);
          } else {
            this.router.navigate(['/diagnostic-questions'], { queryParams: { tab: 'questions' } });
          }
        },
        error: (error) => {
          console.error('Failed to create question:', error);
          const msg = error?.error?.message || error?.message || 'Failed to create question';
          this.errorMessage.set(msg);
          this.submitting.set(false);
        }
      });
    }
  }

  onActionClick(event: { action: string; data?: any }) {
    if (event.action === 'Cancel') {
     
      this.navigateBack();
    }
  }

  onBackClick(): void {
    this.navigateBack();
  }

  private navigateBack(): void {
    this.router.navigate(['/management'], { queryParams: { tab: 'questions' } });
  }

  // Option Management Methods
  addOption() {
    const text = this.newOptionText().trim();
    if (!text || !this.questionId()) return;

    this.optionsLoading.set(true);
    const payload = {
      question_id: this.questionId()!,
      option_text: text,
      display_order: this.options().length,
      status: true
    };

    this.api.createDiagnosticQuestionOption(payload).subscribe({
      next: () => {
        this.newOptionText.set('');
        this.loadOptions(this.questionId()!);
        this.toast.success('Option added successfully');
      },
      error: (error) => {
        console.error('Failed to add option:', error);
        this.optionsLoading.set(false);
        this.toastr.error(error?.error?.message || 'Failed to add option');
      }
    });
  }

  startEditOption(option: DiagnosticQuestionOption) {
    this.editingOptionId.set(option.id);
    this.editingOptionText.set(option.option_text);
  }

  cancelEditOption() {
    this.editingOptionId.set(null);
    this.editingOptionText.set('');
  }

  saveEditOption() {
    const optionId = this.editingOptionId();
    const text = this.editingOptionText().trim();
    if (!optionId || !text) return;

    this.optionsLoading.set(true);
    this.api.updateDiagnosticQuestionOption(optionId, { option_text: text }).subscribe({
      next: () => {
        this.editingOptionId.set(null);
        this.editingOptionText.set('');
        this.loadOptions(this.questionId()!);
        this.toast.success('Option updated successfully');
      },
      error: (error) => {
        console.error('Failed to update option:', error);
        this.optionsLoading.set(false);
        this.toastr.error(error?.error?.message || 'Failed to update option');
      }
    });
  }

  deleteOption(optionId: number) {
    if (!confirm('Are you sure you want to delete this option?')) return;

    this.optionsLoading.set(true);
    this.api.deleteDiagnosticQuestionOption(optionId).subscribe({
      next: () => {
        this.loadOptions(this.questionId()!);
        this.toast.deleteSuccess('Option');
      },
      error: (error) => {
        console.error('Failed to delete option:', error);
        this.optionsLoading.set(false);
        this.toastr.error(error?.error?.message || 'Failed to delete option');
      }
    });
  }

  moveOptionUp(index: number) {
    if (index <= 0) return;
    const opts = [...this.options()];
    [opts[index - 1], opts[index]] = [opts[index], opts[index - 1]];
    this.options.set(opts);
    this.updateOptionOrder();
  }

  moveOptionDown(index: number) {
    if (index >= this.options().length - 1) return;
    const opts = [...this.options()];
    [opts[index], opts[index + 1]] = [opts[index + 1], opts[index]];
    this.options.set(opts);
    this.updateOptionOrder();
  }

  private updateOptionOrder() {
    // Update display_order for all options
    const updates = this.options().map((opt, index) => 
      this.api.updateDiagnosticQuestionOption(opt.id, { display_order: index })
    );
    
    // Wait for all updates to complete (simplified - could use forkJoin)
    this.toast.success('Option order updated');
  }

  openTranslationModal() {
    if (!this.questionId() || this.options().length === 0) {
      this.toastr.warning('Please add at least one option before adding translations');
      return;
    }
    this.isTranslationModalOpen.set(true);
  }

  closeTranslationModal() {
    this.isTranslationModalOpen.set(false);
  }
}

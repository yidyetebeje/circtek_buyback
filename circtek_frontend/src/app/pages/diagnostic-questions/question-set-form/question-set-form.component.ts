import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ToastService } from '../../../core/services/toast.service';
import { HttpParams } from '@angular/common/http';
import { LucideAngularModule, Plus, Trash2, Save, X, ArrowUp, ArrowDown, Languages } from 'lucide-angular';
import { GenericModalComponent, type ModalAction } from '../../../shared/components/generic-modal/generic-modal.component';
import { TranslationModalComponent } from '../translation-modal/translation-modal.component';

// Local types for form state
type QuestionOption = {
  id?: number;
  option_text: string;
  message?: string;
  display_order: number;
  status: boolean;
  _tempId?: string;
};

type Question = {
  id?: number;
  question_text: string;
  status: boolean;
  models?: string[] | null; // Array of model names; null/empty = all models
  options: QuestionOption[];
  _tempId?: string;
};

@Component({
  selector: 'app-question-set-form',
  imports: [CommonModule, FormsModule, LucideAngularModule, GenericModalComponent, TranslationModalComponent],
  templateUrl: './question-set-form.component.html',
  styleUrls: ['./question-set-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionSetFormComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly toast = inject(ToastService);

  // Lucide icons
  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly Save = Save;
  readonly X = X;
  readonly ArrowUp = ArrowUp;
  readonly ArrowDown = ArrowDown;
  readonly Languages = Languages;

  // State
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly questionSetId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.questionSetId() !== null);

  // Form data
  readonly formTitle = signal('');
  readonly formDescription = signal('');
  readonly selectedTenantId = signal<number | null>(null);

  // Questions array
  readonly questions = signal<Question[]>([]);

  // Tenant options
  readonly tenantOptions = signal<Array<{ label: string; value: number }>>([]);

  // iPhone models list (predefined)
  readonly iphoneModels = [
    'iPhone 15 Pro Max',
    'iPhone 15 Pro',
    'iPhone 15 Plus',
    'iPhone 15',
    'iPhone 14 Pro Max',
    'iPhone 14 Pro',
    'iPhone 14 Plus',
    'iPhone 14',
    'iPhone 13 Pro Max',
    'iPhone 13 Pro',
    'iPhone 13 mini',
    'iPhone 13',
    'iPhone 12 Pro Max',
    'iPhone 12 Pro',
    'iPhone 12 mini',
    'iPhone 12',
    'iPhone 11 Pro Max',
    'iPhone 11 Pro',
    'iPhone 11',
    'iPhone XS Max',
    'iPhone XS',
    'iPhone XR',
    'iPhone X',
    'iPhone 8 Plus',
    'iPhone 8',
    'iPhone 7 Plus',
    'iPhone 7',
    'iPhone SE (3rd generation)',
    'iPhone SE (2nd generation)',
    'iPhone SE (1st generation)',
  ];

  // Modal state
  readonly showQuestionModal = signal(false);
  readonly editingQuestionIndex = signal<number | null>(null);
  readonly modalQuestionText = signal('');
  readonly modalNewOptionText = signal('');
  readonly modalNewOptionMessage = signal('');
  readonly modalOptions = signal<QuestionOption[]>([]);
  readonly modalModels = signal<string[]>([]); // Model names for the question

  // Model selection modal state
  readonly showModelSelectionModal = signal(false);
  readonly tempSelectedModels = signal<string[]>([]); // Temporary selection while modal is open

  // Translation modal state
  readonly showTranslationModal = signal(false);
  readonly translatingQuestion = signal<Question | null>(null);

  // Guards
  readonly isSuperAdmin = computed(() => this.auth.currentUser()?.role_id === 1);
  readonly pageTitle = computed(() => this.isEditMode() ? 'Edit Question Set' : 'Create Question Set');
  readonly invalidTitle = computed(() => this.formTitle().trim().length < 3);
  readonly isQuestionsEmpty = computed(() => this.questions().length === 0);
  readonly hasShortQuestion = computed(() => this.questions().some(q => (q.question_text || '').trim().length < 5));
  readonly hasFewOptions = computed(() => this.questions().some(q => (q.options?.length || 0) < 2));
  readonly canSubmit = computed(() => {
    const hasTitle = this.formTitle().trim().length >= 3;
    const hasQuestions = this.questions().length > 0;
    const allQuestionsValid = this.questions().every(q => 
      q.question_text.trim().length >= 5 && q.options.length >= 2
    );
    return hasTitle && hasQuestions && allQuestionsValid && !this.submitting();
  });

  readonly modalActions = computed<ModalAction[]>(() => [
    {
      label: 'Cancel',
      variant: 'ghost',
      action: 'cancel'
    },
    {
      label: this.editingQuestionIndex() !== null ? 'Update Question' : 'Add Question',
      variant: 'accent',
      action: 'save',
      disabled: this.modalQuestionText().trim().length < 5 || this.modalOptions().length < 2
    }
  ]);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !isNaN(Number(id))) {
      this.questionSetId.set(Number(id));
    }

    effect(() => {
      if (this.isSuperAdmin() && !this.isEditMode() && this.tenantOptions().length === 0) {
        this.loadTenantOptions();
      }
    });

    effect(() => {
      const questionSetId = this.questionSetId();
      if (questionSetId) {
        this.loadQuestionSetWithQuestions(questionSetId);
      }
    });
  }

  private loadTenantOptions() {
    this.api.getTenants(new HttpParams().set('limit', '1000').set('status', 'true')).subscribe({
      next: (res) => {
        const options = (res.data ?? [])
          .filter(tenant => tenant.status)
          .map(tenant => ({ label: tenant.name, value: tenant.id }));
        this.tenantOptions.set(options);
      },
      error: (error) => console.error('Failed to load tenants:', error)
    });
  }

  private loadQuestionSetWithQuestions(questionSetId: number) {
    this.loading.set(true);
    this.api.getDiagnosticQuestionSetWithQuestions(questionSetId).subscribe({
      next: (res) => {
        const questionSet = (res as any)?.data ?? (res as any);
        this.formTitle.set(questionSet?.title ?? '');
        this.formDescription.set(questionSet?.description ?? '');

        const questions: Question[] = (questionSet?.questions ?? []).map((q: any) => ({
          id: q.id,
          question_text: q.question_text ?? '',
          status: !!q.status,
          models: q.models ?? null,
          options: (q.options ?? []).map((opt: any) => ({
            id: opt.id,
            option_text: opt.option_text ?? '',
            message: opt.message ?? '',
            display_order: opt.display_order ?? 0,
            status: !!opt.status
          }))
        }));
        this.questions.set(questions);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load question set:', error);
        this.loading.set(false);
        this.router.navigate(['/management'], { queryParams: { tab: 'questions' } });
      }
    });
  }

  openAddQuestionModal() {
    this.editingQuestionIndex.set(null);
    this.modalQuestionText.set('');
    this.modalOptions.set([]);
    this.modalNewOptionText.set('');
    this.modalNewOptionMessage.set('');
    this.modalModels.set([]);
    this.showQuestionModal.set(true);
  }

  openEditQuestionModal(index: number) {
    const question = this.questions()[index];
    this.editingQuestionIndex.set(index);
    this.modalQuestionText.set(question.question_text);
    this.modalOptions.set([...question.options]);
    this.modalNewOptionText.set('');
    this.modalNewOptionMessage.set('');
    this.modalModels.set(question.models ?? []);
    this.showQuestionModal.set(true);
  }

  closeQuestionModal() {
    this.showQuestionModal.set(false);
    this.editingQuestionIndex.set(null);
    this.modalQuestionText.set('');
    this.modalOptions.set([]);
    this.modalNewOptionText.set('');
    this.modalNewOptionMessage.set('');
    this.modalModels.set([]);
  }

  handleModalAction(action: string) {
    if (action === 'cancel') {
      this.closeQuestionModal();
    } else if (action === 'save') {
      this.saveQuestion();
    }
  }

  saveQuestion() {
    const questionText = this.modalQuestionText().trim();
    if (questionText.length < 5 || this.modalOptions().length < 2) return;

    const models = this.modalModels();
    const modelList = models.length > 0 ? models : null; // null = all models

    const editIndex = this.editingQuestionIndex();
    if (editIndex !== null) {
      // Update existing question
      const questions = [...this.questions()];
      questions[editIndex] = {
        ...questions[editIndex],
        question_text: questionText,
        models: modelList,
        options: [...this.modalOptions()]
      };
      this.questions.set(questions);
    } else {
      // Add new question
      const newQuestion: Question = {
        question_text: questionText,
        status: true,
        models: modelList,
        options: [...this.modalOptions()],
        _tempId: `temp-${Date.now()}`
      };
      this.questions.update(qs => [...qs, newQuestion]);
    }

    this.closeQuestionModal();
  }

  addModalOption() {
    const optionText = this.modalNewOptionText().trim();
    if (!optionText) return;

    const newOption: QuestionOption = {
      option_text: optionText,
      message: this.modalNewOptionMessage().trim() || undefined,
      display_order: this.modalOptions().length,
      status: true,
      _tempId: `temp-opt-${Date.now()}`
    };

    this.modalOptions.update(opts => [...opts, newOption]);
    this.modalNewOptionText.set('');
    this.modalNewOptionMessage.set('');
  }

  removeModalOption(index: number) {
    this.modalOptions.update(opts => opts.filter((_, i) => i !== index));
  }

  moveModalOptionUp(index: number) {
    if (index <= 0) return;
    const opts = [...this.modalOptions()];
    [opts[index - 1], opts[index]] = [opts[index], opts[index - 1]];
    this.modalOptions.set(opts);
  }

  moveModalOptionDown(index: number) {
    if (index >= this.modalOptions().length - 1) return;
    const opts = [...this.modalOptions()];
    [opts[index], opts[index + 1]] = [opts[index + 1], opts[index]];
    this.modalOptions.set(opts);
  }

  // Model selection modal methods
  openModelSelectionModal() {
    this.tempSelectedModels.set([...this.modalModels()]);
    this.showModelSelectionModal.set(true);
  }

  closeModelSelectionModal() {
    this.showModelSelectionModal.set(false);
    this.tempSelectedModels.set([]);
  }

  toggleModelSelection(model: string) {
    const current = this.tempSelectedModels();
    if (current.includes(model)) {
      this.tempSelectedModels.set(current.filter(m => m !== model));
    } else {
      this.tempSelectedModels.set([...current, model]);
    }
  }

  isModelSelected(model: string): boolean {
    return this.tempSelectedModels().includes(model);
  }

  selectAllModels() {
    this.tempSelectedModels.set([...this.iphoneModels]);
  }

  clearAllModels() {
    this.tempSelectedModels.set([]);
  }

  applyModelSelection() {
    this.modalModels.set([...this.tempSelectedModels()]);
    this.closeModelSelectionModal();
  }

  removeQuestion(index: number) {
    if (!confirm('Remove this question?')) return;
    this.questions.update(qs => qs.filter((_, i) => i !== index));
  }

  moveQuestionUp(index: number) {
    if (index <= 0) return;
    const qs = [...this.questions()];
    [qs[index - 1], qs[index]] = [qs[index], qs[index - 1]];
    this.questions.set(qs);
  }

  moveQuestionDown(index: number) {
    if (index >= this.questions().length - 1) return;
    const qs = [...this.questions()];
    [qs[index], qs[index + 1]] = [qs[index + 1], qs[index]];
    this.questions.set(qs);
  }


  async onSubmit() {
    if (!this.canSubmit()) return;
    this.submitting.set(true);

    try {
      const tenantId = this.isSuperAdmin() && !this.isEditMode() 
        ? this.selectedTenantId() 
        : this.auth.currentUser()?.tenant_id;

      if (!tenantId && !this.isEditMode()) {
        this.toastr.error('Tenant is required');
        this.submitting.set(false);
        return;
      }

      if (this.isEditMode()) {
        await this.updateQuestionSet();
      } else {
        await this.createQuestionSet(tenantId!);
      }

      this.toast.saveSuccess('Question Set', this.isEditMode() ? 'updated' : 'created');
      this.router.navigate(['/management'], { queryParams: { tab: 'questions' } });
    } catch (error: any) {
      console.error('Failed to save question set:', error);
      const msg = error?.error?.message || error?.message || 'Failed to save question set';
      this.toastr.error(msg);
      this.submitting.set(false);
    }
  }

  private async createQuestionSet(tenantId: number) {
    // Create question set
    const setPayload = {
      title: this.formTitle(),
      description: this.formDescription(),
      status: true,
      tenant_id: tenantId
    };

    console.log('=== Frontend createQuestionSet ===');
    console.log('setPayload:', JSON.stringify(setPayload, null, 2));
    console.log('setPayload.status type:', typeof setPayload.status, 'value:', setPayload.status);

    const setRes: any = await this.api.createDiagnosticQuestionSet(setPayload).toPromise();
    const questionSetId = setRes.data?.id;

    if (!questionSetId) throw new Error('Failed to create question set');

    // Create questions with options
    for (let displayOrder = 0; displayOrder < this.questions().length; displayOrder++) {
      const question = this.questions()[displayOrder];
      
      const questionPayload: any = {
        question_text: question.question_text,
        status: question.status,
        tenant_id: tenantId
      };
      // Only include models if not null (null = all models, so omit the field)
      if (question.models !== null) {
        questionPayload.models = question.models;
      }

      const questionRes: any = await this.api.createDiagnosticQuestion(questionPayload).toPromise();
      const questionId = questionRes.data?.id;

      if (!questionId) throw new Error('Failed to create question');

      // Create options
      for (const option of question.options) {
        const optionPayload = {
          question_id: questionId,
          option_text: option.option_text,
          message: option.message,
          display_order: option.display_order,
          status: option.status
        };
        await this.api.createDiagnosticQuestionOption(optionPayload).toPromise();
      }

      // Add question to set
      await this.api.addQuestionToSet(questionSetId, {
        question_id: questionId,
        display_order: displayOrder
      }).toPromise();
    }
  }

  private async updateQuestionSet() {
    const questionSetId = this.questionSetId()!;
    const tenantId = this.auth.currentUser()?.tenant_id!;

    // Update set basic info
    const setPayload = {
      title: this.formTitle(),
      description: this.formDescription(),
      status: true
    };
    await this.api.updateDiagnosticQuestionSet(questionSetId, setPayload).toPromise();

    // Handle all questions (both existing and new)
    for (let displayOrder = 0; displayOrder < this.questions().length; displayOrder++) {
      const question = this.questions()[displayOrder];
      
      if (question.id) {
        // Update existing question
        const questionPayload: any = {
          question_text: question.question_text,
          status: question.status
        };
        // Only include models if not null (null = all models, so omit the field)
        if (question.models !== null) {
          questionPayload.models = question.models;
        }
        await this.api.updateDiagnosticQuestion(question.id, questionPayload).toPromise();

        // Update existing options and create new ones
        const existingOptionIds = question.options.filter(opt => opt.id).map(opt => opt.id!);
        
        for (const option of question.options) {
          if (option.id) {
            // Update existing option
            const optionPayload = {
              option_text: option.option_text,
              message: option.message,
              display_order: option.display_order,
              status: option.status
            };
            await this.api.updateDiagnosticQuestionOption(option.id, optionPayload).toPromise();
          } else {
            // Create new option
            const optionPayload = {
              question_id: question.id,
              option_text: option.option_text,
              message: option.message,
              display_order: option.display_order,
              status: option.status
            };
            await this.api.createDiagnosticQuestionOption(optionPayload).toPromise();
          }
        }
      } else {
        // Create new question
        const questionPayload: any = {
          question_text: question.question_text,
          status: question.status,
          tenant_id: tenantId
        };
        // Only include models if not null (null = all models, so omit the field)
        if (question.models !== null) {
          questionPayload.models = question.models;
        }

        const questionRes: any = await this.api.createDiagnosticQuestion(questionPayload).toPromise();
        const questionId = questionRes.data?.id;

        if (!questionId) throw new Error('Failed to create question');

        // Create options for the new question
        for (const option of question.options) {
          const optionPayload = {
            question_id: questionId,
            option_text: option.option_text,
            message: option.message,
            display_order: option.display_order,
            status: option.status
          };
          await this.api.createDiagnosticQuestionOption(optionPayload).toPromise();
        }

        // Add question to set
        await this.api.addQuestionToSet(questionSetId, {
          question_id: questionId,
          display_order: displayOrder
        }).toPromise();
      }
    }
  }

  cancel() {
    this.router.navigate(['/management'], { queryParams: { tab: 'questions' } });
  }

  openTranslationModal(question: Question) {
    if (!question.id) {
      this.toastr.warning('Please save the question set first before adding translations');
      return;
    }
    if (question.options.length === 0) {
      this.toastr.warning('Please add options to this question before adding translations');
      return;
    }
    this.translatingQuestion.set(question);
    this.showTranslationModal.set(true);
  }

  closeTranslationModal() {
    this.showTranslationModal.set(false);
    this.translatingQuestion.set(null);
  }
}

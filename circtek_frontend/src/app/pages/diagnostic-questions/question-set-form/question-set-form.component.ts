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

  // Modal state
  readonly showQuestionModal = signal(false);
  readonly editingQuestionIndex = signal<number | null>(null);
  readonly modalQuestionText = signal('');
  readonly modalNewOptionText = signal('');
  readonly modalNewOptionMessage = signal('');
  readonly modalOptions = signal<QuestionOption[]>([]);

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
    this.showQuestionModal.set(true);
  }

  openEditQuestionModal(index: number) {
    const question = this.questions()[index];
    this.editingQuestionIndex.set(index);
    this.modalQuestionText.set(question.question_text);
    this.modalOptions.set([...question.options]);
    this.modalNewOptionText.set('');
    this.modalNewOptionMessage.set('');
    this.showQuestionModal.set(true);
  }

  closeQuestionModal() {
    this.showQuestionModal.set(false);
    this.editingQuestionIndex.set(null);
    this.modalQuestionText.set('');
    this.modalOptions.set([]);
    this.modalNewOptionText.set('');
    this.modalNewOptionMessage.set('');
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

    const editIndex = this.editingQuestionIndex();
    if (editIndex !== null) {
      // Update existing question
      const questions = [...this.questions()];
      questions[editIndex] = {
        ...questions[editIndex],
        question_text: questionText,
        options: [...this.modalOptions()]
      };
      this.questions.set(questions);
    } else {
      // Add new question
      const newQuestion: Question = {
        question_text: questionText,
        status: true,
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
      
      const questionPayload = {
        question_text: question.question_text,
        status: question.status,
        tenant_id: tenantId
      };

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

    // Handle new questions (questions without an id)
    for (let displayOrder = 0; displayOrder < this.questions().length; displayOrder++) {
      const question = this.questions()[displayOrder];
      
      // Skip existing questions (they already have an id)
      if (question.id) {
        continue;
      }

      // Create new question
      const questionPayload = {
        question_text: question.question_text,
        status: question.status,
        tenant_id: tenantId
      };

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

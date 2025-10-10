import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { ToastrService } from 'ngx-toastr';
import { ToastService } from '../../../core/services/toast.service';
import { DiagnosticQuestionOption, SUPPORTED_LANGUAGES, BulkTranslationPayload } from '../../../core/models/diagnostic-question';
import { LucideAngularModule, Languages, Save, X } from 'lucide-angular';

interface TranslationData {
  [languageCode: string]: {
    question_text: string;
    options: {
      [optionId: number]: string;
    };
  };
}

@Component({
  selector: 'app-translation-modal',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './translation-modal.component.html',
  styleUrls: ['./translation-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranslationModalComponent {
  private readonly api = inject(ApiService);
  private readonly toastr = inject(ToastrService);
  private readonly toast = inject(ToastService);

  // Icons
  protected readonly LanguagesIcon = Languages;
  protected readonly SaveIcon = Save;
  protected readonly XIcon = X;

  // Inputs
  isOpen = input<boolean>(false);
  questionId = input<number | null>(null);
  questionText = input<string>('');
  options = input<DiagnosticQuestionOption[]>([]);

  // Outputs
  closeModal = output<void>();

  // State
  loading = signal(false);
  saving = signal(false);
  activeLanguage = signal<string>('es');
  translationData = signal<TranslationData>({});

  // Constants
  languages = SUPPORTED_LANGUAGES;

  // Computed
  currentTranslation = computed(() => {
    const lang = this.activeLanguage();
    const data = this.translationData();
    return data[lang] || {
      question_text: '',
      options: {}
    };
  });

  hasUnsavedChanges = computed(() => {
    const data = this.translationData();
    return Object.keys(data).length > 0;
  });

  constructor() {
    // Load translations when modal opens
    effect(() => {
      const open = this.isOpen();
      const qId = this.questionId();
      if (open && qId) {
        this.loadTranslations(qId);
      }
    });
  }

  private loadTranslations(questionId: number) {
    this.loading.set(true);
    this.api.getQuestionTranslations(questionId).subscribe({
      next: (res) => {
        const translations = res.data?.translations || {};
        
        // Initialize empty translations for languages that don't have data
        const initializedData: TranslationData = {};
        this.languages.forEach(lang => {
          initializedData[lang.code] = translations[lang.code] || {
            question_text: '',
            options: {}
          };
          
          // Ensure all options have entries
          this.options().forEach(opt => {
            if (!initializedData[lang.code].options[opt.id]) {
              initializedData[lang.code].options[opt.id] = '';
            }
          });
        });
        
        this.translationData.set(initializedData);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load translations:', error);
        this.loading.set(false);
        this.toastr.error('Failed to load translations');
      }
    });
  }

  selectLanguage(languageCode: string) {
    this.activeLanguage.set(languageCode);
  }

  updateQuestionTranslation(event: Event) {
    const text = (event.target as HTMLTextAreaElement).value;
    const lang = this.activeLanguage();
    const data = { ...this.translationData() };
    
    if (!data[lang]) {
      data[lang] = { question_text: '', options: {} };
    }
    
    data[lang].question_text = text;
    this.translationData.set(data);
  }

  updateOptionTranslation(optionId: number, event: Event) {
    const text = (event.target as HTMLInputElement).value;
    const lang = this.activeLanguage();
    const data = { ...this.translationData() };
    
    if (!data[lang]) {
      data[lang] = { question_text: '', options: {} };
    }
    
    data[lang].options[optionId] = text;
    this.translationData.set(data);
  }

  getOptionText(optionId: number): string {
    return this.currentTranslation().options[optionId] || '';
  }

  saveTranslations() {
    const qId = this.questionId();
    if (!qId) return;

    this.saving.set(true);
    
    // Build payload
    const translations = this.languages
      .map(lang => {
        const data = this.translationData()[lang.code];
        if (!data || !data.question_text.trim()) return null;
        
        return {
          language_code: lang.code,
          question_text: data.question_text,
          options: this.options().map(opt => ({
            option_id: opt.id,
            option_text: data.options[opt.id] || ''
          }))
        };
      })
      .filter(t => t !== null);

    const payload: BulkTranslationPayload = {
      question_id: qId,
      translations: translations as any
    };

    this.api.saveQuestionTranslations(qId, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Translations saved successfully');
        this.close();
      },
      error: (error) => {
        console.error('Failed to save translations:', error);
        this.saving.set(false);
        this.toastr.error(error?.error?.message || 'Failed to save translations');
      }
    });
  }

  close() {
    this.closeModal.emit();
  }

  getCompletionPercentage(langCode: string): number {
    const data = this.translationData()[langCode];
    if (!data) return 0;
    
    const questionFilled = data.question_text.trim().length > 0 ? 1 : 0;
    const optionCount = this.options().length;
    const optionsFilled = this.options().filter(opt => 
      (data.options[opt.id] || '').trim().length > 0
    ).length;
    
    const total = 1 + optionCount; // question + all options
    const filled = questionFilled + optionsFilled;
    
    return Math.round((filled / total) * 100);
  }

  getActiveLanguageName(): string {
    const lang = this.languages.find(l => l.code === this.activeLanguage());
    return lang ? lang.name : '';
  }
}

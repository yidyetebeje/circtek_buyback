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
      [optionKey: string]: string; // Changed from number to string to support both "id_123" and "temp_abc" keys
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
  allowUnsavedQuestions = input<boolean>(false);
  existingTranslations = input<any[] | undefined>(undefined); // Existing temp translations

  // Outputs
  closeModal = output<void>();
  translationsSaved = output<any[]>();

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
      const allowUnsaved = this.allowUnsavedQuestions();
      const existingTranslations = this.existingTranslations();
      
      if (open) {
        if (qId) {
          // If we have existing temp translations, use those (unsaved changes take priority)
          if (existingTranslations && existingTranslations.length > 0) {
            this.initializeTranslationsWithExisting(existingTranslations);
          } else {
            // Load from backend for saved questions without temp changes
            this.loadTranslations(qId);
          }
        } else if (allowUnsaved) {
          // Initialize translations for unsaved questions (may have existing temp translations)
          this.initializeTranslationsWithExisting(existingTranslations);
        }
      }
    });
  }

  private initializeEmptyTranslations() {
    const initializedData: TranslationData = {};
    this.languages.forEach(lang => {
      initializedData[lang.code] = {
        question_text: '',
        options: {}
      };
      
      // Ensure all options have entries using unique keys
      this.options().forEach(opt => {
        const optionKey = this.getOptionKey(opt);
        initializedData[lang.code].options[optionKey] = '';
      });
    });
    
    this.translationData.set(initializedData);
  }

  private initializeTranslationsWithExisting(existingTranslations?: any[]) {
    const initializedData: TranslationData = {};
    
    this.languages.forEach(lang => {
      // Find existing translation for this language
      const existingLangTranslation = existingTranslations?.find(t => t.language_code === lang.code);
      
      initializedData[lang.code] = {
        question_text: existingLangTranslation?.question_text || '',
        options: {}
      };
      
      // Populate options with existing translations or empty strings
      this.options().forEach(opt => {
        const optionKey = this.getOptionKey(opt);
        
        // Find existing option translation by matching _tempId (for unsaved) or option_id (for saved)
        const existingOptionTranslation = existingLangTranslation?.options?.find((o: any) => {
          // For unsaved options, match by _tempId
          if ((opt as any)._tempId && o._tempId) {
            return o._tempId === (opt as any)._tempId;
          }
          // For saved options, match by option_id
          if (opt.id && o.option_id) {
            return o.option_id === opt.id;
          }
          return false;
        });
        
        initializedData[lang.code].options[optionKey] = existingOptionTranslation?.option_text || '';
      });
    });
    
    this.translationData.set(initializedData);
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
          
          // Ensure all options have entries using unique keys
          this.options().forEach(opt => {
            const optionKey = this.getOptionKey(opt);
            if (!initializedData[lang.code].options[optionKey]) {
              // Try to find existing translation by ID for saved options
              const existingTranslation = opt.id && translations[lang.code] && translations[lang.code].options[opt.id];
              initializedData[lang.code].options[optionKey] = existingTranslation || '';
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

  // Get unique identifier for an option (handles both saved and unsaved options)
  getOptionKey(option: any): string {
    return option.id ? `id_${option.id}` : `temp_${option._tempId || 'unknown'}`;
  }

  getOptionTextByKey(optionKey: string): string {
    return this.currentTranslation().options[optionKey] || '';
  }

  updateOptionTranslationByKey(optionKey: string, event: Event) {
    const text = (event.target as HTMLInputElement).value;
    const lang = this.activeLanguage();
    const data = { ...this.translationData() };
    
    if (!data[lang]) {
      data[lang] = { question_text: '', options: {} };
    }
    
    data[lang].options[optionKey] = text;
    this.translationData.set(data);
  }

  saveTranslations() {
    const qId = this.questionId();
    const allowUnsaved = this.allowUnsavedQuestions();
    
    // For unsaved questions, we don't need a questionId
    if (!qId && !allowUnsaved) return;

    this.saving.set(true);
    
    // Build translations
    const translations = this.languages
      .map(lang => {
        const data = this.translationData()[lang.code];
        if (!data || !data.question_text.trim()) return null;
        
        return {
          language_code: lang.code,
          question_text: data.question_text,
          options: this.options().map(opt => {
            const optionKey = this.getOptionKey(opt);
            return {
              option_id: opt.id,
              option_text: data.options[optionKey] || '',
              _tempId: (opt as any)._tempId // Include tempId for unsaved options
            };
          })
        };
      })
      .filter(t => t !== null);

    // If this is an unsaved question, emit the translations to parent
    if (!qId && allowUnsaved) {
      this.translationsSaved.emit(translations as any);
      this.saving.set(false);
      this.close();
      return;
    }

    // For saved questions, use the API
    if (qId) {
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
  }

  close() {
    this.closeModal.emit();
  }

  getCompletionPercentage(langCode: string): number {
    const data = this.translationData()[langCode];
    if (!data) return 0;
    
    const questionFilled = data.question_text.trim().length > 0 ? 1 : 0;
    const optionCount = this.options().length;
    const optionsFilled = this.options().filter(opt => {
      const optionKey = this.getOptionKey(opt);
      return (data.options[optionKey] || '').trim().length > 0;
    }).length;
    
    const total = 1 + optionCount; // question + all options
    const filled = questionFilled + optionsFilled;
    
    return Math.round((filled / total) * 100);
  }

  getActiveLanguageName(): string {
    const lang = this.languages.find(l => l.code === this.activeLanguage());
    return lang ? lang.name : '';
  }
}

export interface DiagnosticQuestion {
  id: number;
  question_text: string;
  description: string | null;
  status: boolean | null;
  tenant_id: number;
  tenant_name?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DiagnosticQuestionOption {
  id: number;
  question_id: number;
  option_text: string;
  display_order: number | null;
  status: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DiagnosticQuestionSet {
  id: number;
  title: string;
  description: string | null;
  status: boolean | null;
  tenant_id: number;
  tenant_name?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DiagnosticQuestionSetAssignment {
  id: number;
  question_set_id: number;
  question_set_title?: string;
  tester_id: number;
  tester_name?: string;
  status: 'active' | 'inactive';
  assigned_by: number;
  assigned_by_name?: string;
  assigned_at: string | null;
  tenant_id: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface DiagnosticQuestionWithOptions extends DiagnosticQuestion {
  options: DiagnosticQuestionOption[];
}

export interface DiagnosticQuestionSetWithQuestions extends DiagnosticQuestionSet {
  questions: DiagnosticQuestionWithOptions[];
}

export interface DiagnosticQuestionTranslation {
  id: number;
  entity_type: 'question' | 'option';
  entity_id: number;
  language_code: string;
  translated_text: string;
  tenant_id: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface QuestionTranslations {
  question_id: number;
  translations: {
    [language_code: string]: {
      question_text: string;
      options: {
        [option_id: number]: string;
      };
    };
  };
}

export interface BulkTranslationPayload {
  question_id: number;
  translations: {
    language_code: string;
    question_text: string;
    options: {
      option_id: number;
      option_text: string;
    }[];
  }[];
}

export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'fr', name: 'French', flag: '🇫🇷' }
] as const;

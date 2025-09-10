import { Language } from '@/store/atoms';
import { 
  QuestionSet, 
  IndividualQuestion, 
  QuestionOption
} from '@/types/catalog/device-questions';

/**
 * Get translated content for a question set based on current language
 */
export function getTranslatedQuestionSetContent(
  questionSet: QuestionSet, 
  currentLanguage: Language | null
): {
  displayName: string;
  description?: string;
} {
  // If no current language or no translations, return default content
  if (!currentLanguage || !questionSet.translations || questionSet.translations.length === 0) {
    return {
      displayName: questionSet.displayName,
      description: questionSet.description || undefined,
    };
  }

  // Find translation for current language
  const translation = questionSet.translations.find(
    (t) => t.language?.code === currentLanguage.code || t.languageId === parseInt(currentLanguage.id)
  );

  // If translation found, use translated content with fallbacks
  if (translation) {
    return {
      displayName: translation.displayName || questionSet.displayName,
      description: translation.description || questionSet.description || undefined,
    };
  }

  // Fallback to default language or original content
  const defaultTranslation = questionSet.translations.find(
    (t) => t.language?.is_default === true
  );

  if (defaultTranslation) {
    return {
      displayName: defaultTranslation.displayName || questionSet.displayName,
      description: defaultTranslation.description || questionSet.description || undefined,
    };
  }

  // Final fallback to original content
  return {
    displayName: questionSet.displayName,
    description: questionSet.description || undefined,
  };
}

/**
 * Get translated content for an individual question based on current language
 */
export function getTranslatedQuestionContent(
  question: IndividualQuestion, 
  currentLanguage: Language | null
): {
  title: string;
  tooltip?: string;
  category?: string;
} {
  // If no current language or no translations, return default content
  if (!currentLanguage || !question.translations || question.translations.length === 0) {
    return {
      title: question.title,
      tooltip: question.tooltip || undefined,
      category: question.category || undefined,
    };
  }

  // Find translation for current language
  const translation = question.translations.find(
    (t) => t.language?.code === currentLanguage.code || t.languageId === parseInt(currentLanguage.id)
  );

  // If translation found, use translated content with fallbacks
  if (translation) {
    return {
      title: translation.title || question.title,
      tooltip: translation.tooltip || question.tooltip || undefined,
      category: translation.category || question.category || undefined,
    };
  }

  // Fallback to default language or original content
  const defaultTranslation = question.translations.find(
    (t) => t.language?.is_default === true
  );

  if (defaultTranslation) {
    return {
      title: defaultTranslation.title || question.title,
      tooltip: defaultTranslation.tooltip || question.tooltip || undefined,
      category: defaultTranslation.category || question.category || undefined,
    };
  }

  // Final fallback to original content
  return {
    title: question.title,
    tooltip: question.tooltip || undefined,
    category: question.category || undefined,
  };
}

/**
 * Get translated content for a question option based on current language
 */
export function getTranslatedOptionContent(
  option: QuestionOption, 
  currentLanguage: Language | null
): {
  title: string;
} {
  // If no current language or no translations, return default content
  if (!currentLanguage || !option.translations || option.translations.length === 0) {
    return {
      title: option.title,
    };
  }

  // Find translation for current language
  const translation = option.translations.find(
    (t) => t.language?.code === currentLanguage.code || t.languageId === parseInt(currentLanguage.id)
  );

  // If translation found, use translated content with fallbacks
  if (translation) {
    return {
      title: translation.title || option.title,
    };
  }

  // Fallback to default language or original content
  const defaultTranslation = option.translations.find(
    (t) => t.language?.is_default === true
  );

  if (defaultTranslation) {
    return {
      title: defaultTranslation.title || option.title,
    };
  }

  // Final fallback to original content
  return {
    title: option.title,
  };
}

/**
 * Get translated title for a question (simplified version)
 */
export function getTranslatedQuestionTitle(
  question: IndividualQuestion, 
  currentLanguage: Language | null
): string {
  return getTranslatedQuestionContent(question, currentLanguage).title;
}

/**
 * Get translated title for an option (simplified version)
 */
export function getTranslatedOptionTitle(
  option: QuestionOption, 
  currentLanguage: Language | null
): string {
  return getTranslatedOptionContent(option, currentLanguage).title;
} 
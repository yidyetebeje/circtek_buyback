'use client';

import { useAtomValue } from 'jotai';
import { currentLanguageObjectAtom } from '@/store/atoms';
import { 
  getTranslatedQuestionSetContent, 
  getTranslatedQuestionContent, 
  getTranslatedOptionContent 
} from '@/utils/questionTranslationUtils';
import { QuestionSet, IndividualQuestion, QuestionOption } from '@/types/catalog/device-questions';

/**
 * Hook to get translated question content based on current language
 */
export const useQuestionTranslation = () => {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  
  return {
    getTranslatedQuestionSet: (questionSet: QuestionSet) => 
      getTranslatedQuestionSetContent(questionSet, currentLanguage),
    getTranslatedQuestion: (question: IndividualQuestion) => 
      getTranslatedQuestionContent(question, currentLanguage),
    getTranslatedOption: (option: QuestionOption) => 
      getTranslatedOptionContent(option, currentLanguage),
    currentLanguage
  };
};

/**
 * Hook to get translated content for a specific question set
 */
export const useQuestionSetTranslationContent = (questionSet: QuestionSet) => {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  
  return getTranslatedQuestionSetContent(questionSet, currentLanguage);
};

/**
 * Hook to get translated content for a specific question
 */
export const useQuestionTranslationContent = (question: IndividualQuestion) => {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  
  return getTranslatedQuestionContent(question, currentLanguage);
};

/**
 * Hook to get translated content for a specific option
 */
export const useOptionTranslationContent = (option: QuestionOption) => {
  const currentLanguage = useAtomValue(currentLanguageObjectAtom);
  
  return getTranslatedOptionContent(option, currentLanguage);
}; 
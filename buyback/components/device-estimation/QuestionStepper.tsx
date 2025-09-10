"use client";

import { DeviceEstimationQuestion, ThemeColors, TranslatableText } from "@/types/shop";

interface QuestionStepperProps {
  questions: DeviceEstimationQuestion[];
  currentQuestionIndex: number;
  onAnswer: (questionId: string, value: string) => void;
  theme: ThemeColors;
  locale?: string;
  defaultLocale?: string;
  currentAnswers: Record<string, string>;
}

const getLocalizedText = (textObj: TranslatableText | string | undefined, locale: string, defaultLocale: string): string => {
  if (!textObj) return '';
  if (typeof textObj === 'string') {
    // Assuming this string is the model's primary language data (e.g., English)
    return textObj;
  }

  // textObj is of type TranslatableText
  if (textObj[locale]) {
    return textObj[locale];
  }
  // If the specific locale's translation is not found, fallback to English ('en')
  // This is the "question model information since it is in english"
  if (textObj['en']) {
    return textObj['en'];
  }
  // If 'en' is also not available, and defaultLocale is different from 'en' and available, use it.
  // This handles a rare case where 'en' might be missing but another default is specified.
  if (defaultLocale && defaultLocale !== 'en' && textObj[defaultLocale]) {
    return textObj[defaultLocale];
  }
  return ''; // All fallbacks failed
};

export function QuestionStepper({
  questions,
  currentQuestionIndex,
  onAnswer,
  theme,
  locale = 'en',
  defaultLocale = 'en',
  currentAnswers
}: QuestionStepperProps) {
  const currentQuestion = questions[currentQuestionIndex];
  const selectedValue = currentAnswers[currentQuestion?.id];

  if (!currentQuestion) {
    return <div>No question to display or end of questions.</div>;
  }

  const questionText = getLocalizedText(currentQuestion.text, locale, defaultLocale);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 space-y-6">
      <h3 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-white">
        {questionText}
      </h3>
      
      {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
        <div className="flex flex-wrap gap-3 mt-4">
          {currentQuestion.options.map((option) => {
            const optionLabel = getLocalizedText(option.label, locale, defaultLocale);
            const optionDescription = getLocalizedText(option.description, locale, defaultLocale);
            const isSelected = selectedValue === option.value;

            return (
              <button
                key={option.value}
                onClick={() => onAnswer(currentQuestion.id, option.value)}
                title={optionDescription || optionLabel}
                className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 min-w-[100px] min-h-[80px] text-center ${isSelected ? 'ring-2 shadow-xl border-transparent' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}
                style={{
                  borderColor: isSelected ? theme.primary : undefined,
                  backgroundColor: isSelected ? theme.primary + '1A' : 'white',
                  color: isSelected ? theme.primary : theme.text,
                }}
              >
                {option.icon && <span className="text-2xl mb-1.5">{option.icon}</span>}
                <span className="text-sm font-medium leading-tight">{optionLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {currentQuestion.type === 'slider' && (
        <div className="mt-4 pt-2">
          <input 
            type="range" 
            min="0" 
            max="100"
            defaultValue="50" 
            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer range-thumb:bg-[var(--theme-primary)]"
            style={{accentColor: theme.primary}}
            onChange={(e) => onAnswer(currentQuestion.id, e.target.value)} 
          />
        </div>
      )}

      {currentQuestion.type === 'text-input' && (
        <div className="mt-4">
          <input
            type="text"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-800 dark:bg-gray-700 dark:text-white"
            style={{borderColor: theme.accent + '80'}}
            onChange={(e) => onAnswer(currentQuestion.id, e.target.value)}
            placeholder={getLocalizedText(currentQuestion.options?.[0]?.label, locale, defaultLocale) || 'Enter your answer'}
          />
        </div>
      )}

      {/* TODO: Add Next/Prev buttons if navigation isn't solely based on answering */}
    </div>
  );
} 
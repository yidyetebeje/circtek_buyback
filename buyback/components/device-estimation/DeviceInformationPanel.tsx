"use client";

import { DeviceInformation, ThemeColors, DeviceEstimationQuestion, TranslatableText } from "@/types/shop";
import { getLocalizedText } from "@/utils/localization";
import Image from "next/image";

interface DeviceInformationPanelProps {
  deviceInfo: DeviceInformation;
  theme: ThemeColors;
  questions: DeviceEstimationQuestion[];
  answers: Record<string, string>;
  currentLocale?: string;
  defaultLocale?: string;
}

const resolveText = (textObj: TranslatableText | string | undefined, locale: string, defaultLocale: string): string | undefined => {
  if (typeof textObj === 'string') return textObj;
  if (textObj) return getLocalizedText(textObj, locale, defaultLocale);
  return undefined;
};

export function DeviceInformationPanel({
  deviceInfo,
  theme,
  questions,
  answers,
  currentLocale = 'en',
  defaultLocale = 'en',
}: DeviceInformationPanelProps) {
  const deviceName = resolveText(deviceInfo.name, currentLocale, defaultLocale) || 'Device';
  const deviceDescription = resolveText(deviceInfo.description, currentLocale, defaultLocale);
  const answeredQuestionIds = Object.keys(answers);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl lg:text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
        {deviceName}
      </h2>
      {deviceInfo.imageUrl && (
        <div className="relative w-full h-48 mb-5 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
          <Image 
            src={deviceInfo.imageUrl} 
            alt={deviceName} 
            layout="fill"
            objectFit="contain"
            className="p-2"
          />
        </div>
      )}
      {deviceDescription && (
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          {deviceDescription}
        </p>
      )}
      
      {/* Display Selected Answers */}
      {answeredQuestionIds.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Your Selections</h3>
          {answeredQuestionIds.map(questionId => {
            const question = questions.find(q => q.id === questionId);
            const answerValue = answers[questionId];
            if (!question) return null;

            let displayAnswer = answerValue;
            if (question.type === 'multiple-choice' && question.options) {
              const selectedOption = question.options.find(opt => opt.value === answerValue);
              if (selectedOption) {
                displayAnswer = resolveText(selectedOption.label, currentLocale, defaultLocale) || answerValue;
              }
            }
            
            const displayQuestionText = resolveText(question.text, currentLocale, defaultLocale);

            return (
              <div key={questionId} className="flex justify-between items-center text-sm py-1">
                <span className="text-gray-600 dark:text-gray-400 truncate mr-3" title={displayQuestionText}>{(displayQuestionText || 'Question').substring(0, 25)}{displayQuestionText && displayQuestionText.length > 25 ? '...' : ''}:</span>
                <span className="font-medium text-right" style={{ color: theme.primary }}>{displayAnswer}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 
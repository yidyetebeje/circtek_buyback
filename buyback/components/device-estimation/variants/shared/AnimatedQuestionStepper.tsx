"use client";

import { motion, AnimatePresence } from "framer-motion";
import { DeviceEstimationQuestion, ThemeColors, TranslatableText } from "@/types/shop";
import { AnimatedOptionSelector } from "./AnimatedOptionSelector";

interface AnimatedQuestionStepperProps {
  questions: DeviceEstimationQuestion[];
  currentQuestionIndex: number;
  onAnswer: (questionId: string, value: string) => void;
  theme: ThemeColors;
  locale?: string;
  defaultLocale?: string;
  currentAnswers: Record<string, string>;
  onPrevQuestion: () => void;
  onNextQuestion: () => void;
}

const getLocalizedText = (textObj: TranslatableText | string | undefined, locale: string, defaultLocale: string): string => {
  if (!textObj) return '';
  if (typeof textObj === 'string') return textObj;
  
 
    textObj,
    locale,
    defaultLocale,
    availableLocales: Object.keys(textObj)
  });
  
  const result = textObj[locale] || textObj[defaultLocale] || '';
 
  
  return result;
};

export function AnimatedQuestionStepper({
  questions,
  currentQuestionIndex,
  onAnswer,
  theme,
  locale = 'en',
  defaultLocale = 'en',
  currentAnswers,
  onPrevQuestion,
  onNextQuestion
}: AnimatedQuestionStepperProps) {
  const currentQuestion = questions[currentQuestionIndex];
  const selectedValue = currentAnswers[currentQuestion?.id];

  if (!currentQuestion) {
    return <div>No question to display or end of questions.</div>;
  }

  const questionText = getLocalizedText(currentQuestion.text, locale, defaultLocale);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      transition: { duration: 0.3 }
    }
  };

  const optionsContainerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.08,
        delayChildren: 0.3
      }
    }
  };

  const optionItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={currentQuestion.id}
        className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 space-y-6 mt-4 w-full max-w-4xl mx-auto"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
      >
        <motion.h3 
          className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-white min-h-[4.5rem]"
          variants={{
            hidden: { opacity: 0, y: -10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
          }}
        >
          {questionText}
        </motion.h3>
        
        {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
          <motion.div 
            className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 mt-6 w-full mx-auto"
            variants={optionsContainerVariants}
          >
            {currentQuestion.options.map((option) => {
              const optionLabel = getLocalizedText(option.label, locale, defaultLocale);
              const optionDescription = getLocalizedText(option.description, locale, defaultLocale);
              const isSelected = selectedValue === option.value;

              return (
                <motion.div key={option.value} variants={optionItemVariants} className="w-full sm:w-auto">
                  <AnimatedOptionSelector
                    optionValue={option.value}
                    optionLabel={optionLabel}
                    optionDescription={optionDescription}
                    optionIcon={option.icon}
                    isSelected={isSelected}
                    onClick={() => onAnswer(currentQuestion.id, option.value)}
                    theme={theme}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {currentQuestion.type === 'slider' && (
          <motion.div 
            className="mt-6 pt-2"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { delay: 0.3, duration: 0.5 } }
            }}
          >
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
              <span>Min</span>
              <span>Max</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100"
              defaultValue="50" 
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
              style={{accentColor: theme.primary}}
              onChange={(e) => onAnswer(currentQuestion.id, e.target.value)} 
            />
            <div className="flex justify-center mt-4">
              <motion.div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: theme.primary }}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                50%
              </motion.div>
            </div>
          </motion.div>
        )}

        {currentQuestion.type === 'text-input' && (
          <motion.div 
            className="mt-6"
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.5 } }
            }}
          >
            <input
              type="text"
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-800 dark:bg-gray-700 dark:text-white"
              style={{
                borderColor: `${theme.primary}30`,
                boxShadow: `0 4px 10px ${theme.primary}10`
              }}
              onChange={(e) => onAnswer(currentQuestion.id, e.target.value)}
              placeholder={getLocalizedText(currentQuestion.options?.[0]?.label, locale, defaultLocale) || 'Enter your answer'}
            />
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <motion.div
          className="flex justify-between mt-8"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { delay: 0.4, duration: 0.5 } }
          }}
        >
          {currentQuestionIndex > 0 && (
            <motion.button
              onClick={onPrevQuestion}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>
          )}

          {currentAnswers[currentQuestion.id] && (
            <motion.button
              onClick={onNextQuestion}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: theme.primary }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: `0 0 0 4px ${theme.primary}20`
              }}
              whileTap={{ scale: 0.95 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

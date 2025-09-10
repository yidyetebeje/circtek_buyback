"use client";

import { motion } from "framer-motion";
import { AnimatedDeviceInformationPanel } from './shared/AnimatedDeviceInformationPanel';
import { AnimatedQuestionStepper } from './shared/AnimatedQuestionStepper';
import { AnimatedPriceEstimationDisplay } from './shared/AnimatedPriceEstimationDisplay';
import { DeviceInformation, DeviceEstimationQuestion, ThemeColors, TranslatableText } from '@/types/shop';

// Re-use or redefine props interface (could be shared type)
interface CompactStepperEstimationVariantProps {
  initialDevice: DeviceInformation;
  questions: DeviceEstimationQuestion[];
  answers: Record<string, string>;
  currentQuestionIndex: number;
  totalQuestions: number;
  estimatedPrice: number | null;
  progress: number;
  theme: ThemeColors;
  shopName?: string;
  estimationResultTitle?: TranslatableText;
  checkoutButtonText?: TranslatableText;
  currentLocale: string;
  defaultLocale: string;
  handleAnswer: (questionId: string, answer: string) => void;
  handleCheckout: () => void;
  handlePrevQuestion: () => void;
  handleNextQuestion: () => void;
}

export function CompactStepperEstimationVariant({ 
  initialDevice, questions, answers, currentQuestionIndex, totalQuestions,
  estimatedPrice, progress, theme, shopName, estimationResultTitle,
  checkoutButtonText, currentLocale, defaultLocale, handleAnswer, handleCheckout,
  handlePrevQuestion, handleNextQuestion 
}: CompactStepperEstimationVariantProps) {
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
        delayChildren: 0.1,
        duration: 0.4
      }
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
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
    // Single column layout with animations
    <motion.div 
      className="flex flex-col items-center gap-10 xl:gap-12 max-w-3xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Device Info First */}
      <motion.section 
        className="w-full"
        variants={sectionVariants}
      >
        <AnimatedDeviceInformationPanel 
          deviceInfo={initialDevice} 
          theme={theme}
          currentLocale={currentLocale}
          defaultLocale={defaultLocale}
          questions={questions}
          answers={answers}
        />
      </motion.section>

      {/* Stepper/Result Area Second */}
      <motion.section 
        className="w-full"
        variants={sectionVariants}
      >
        {/* Progress Bar */}
        {totalQuestions > 0 && currentQuestionIndex < totalQuestions && estimatedPrice === null && (
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, width: "0%" }}
            animate={{ opacity: 1, width: "100%" }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex justify-between">
              <span>Step {currentQuestionIndex + 1} of {totalQuestions}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <motion.div
                className="h-2.5 rounded-full"
                style={{ backgroundColor: theme.primary }}
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ 
                  duration: 0.7, 
                  ease: "easeOut",
                  delay: 0.5
                }}
              />
            </div>
          </motion.div>
        )}
        
        {/* Conditional Rendering Area */}
        <motion.div 
          className="transition-all"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {estimatedPrice === null && totalQuestions > 0 && currentQuestionIndex < totalQuestions ? (
            <AnimatedQuestionStepper
              questions={questions}
              currentQuestionIndex={currentQuestionIndex}
              onAnswer={handleAnswer}
              theme={theme}
              locale={currentLocale}
              defaultLocale={defaultLocale}
              currentAnswers={answers}
              onPrevQuestion={handlePrevQuestion}
              onNextQuestion={handleNextQuestion}
            />
          ) : (
            <AnimatedPriceEstimationDisplay
              estimatedPrice={estimatedPrice}
              onCheckout={handleCheckout}
              theme={theme}
              shopName={shopName}
              estimationTitle={estimationResultTitle}
              checkoutButtonText={checkoutButtonText}
              locale={currentLocale}
              defaultLocale={defaultLocale}
            />
          )}
        </motion.div>
      </motion.section>
    </motion.div>
  );
} 
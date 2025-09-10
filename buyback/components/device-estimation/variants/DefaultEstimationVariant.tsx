"use client";

import { motion } from "framer-motion";
import { AnimatedDeviceInformationPanel } from './shared/AnimatedDeviceInformationPanel';
import { AnimatedQuestionStepper } from './shared/AnimatedQuestionStepper';
import { AnimatedPriceEstimationDisplay } from './shared/AnimatedPriceEstimationDisplay';
import { DeviceInformation, DeviceEstimationQuestion, ThemeColors, TranslatableText } from '@/types/shop';

interface DefaultEstimationVariantProps {
  // Props needed by the layout and child components
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

export function DefaultEstimationVariant({ 
  initialDevice, questions, answers, currentQuestionIndex, totalQuestions,
  estimatedPrice, progress, theme, shopName, estimationResultTitle,
  checkoutButtonText, currentLocale, defaultLocale, handleAnswer, handleCheckout,
  handlePrevQuestion, handleNextQuestion 
}: DefaultEstimationVariantProps) {
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
        delayChildren: 0.1,
        duration: 0.5
      }
    }
  };

  const columnVariants = {
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
    <motion.div 
      className="flex flex-col lg:flex-row gap-10 xl:gap-12 relative pt-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Left Column */}
      <motion.aside 
        className="lg:w-1/5 space-y-6 lg:sticky lg:top-24 h-fit"
        variants={columnVariants}
      >
        <AnimatedDeviceInformationPanel 
          deviceInfo={initialDevice} 
          theme={theme}
          currentLocale={currentLocale}
          defaultLocale={defaultLocale}
          questions={questions}
          answers={answers}
        />
      </motion.aside>

      {/* Right Column */}
      <motion.main 
        className="lg:w-4/5 space-y-8"
        variants={columnVariants}
      >
        {/* Progress Bar - Full Width Without Text Steps */}
        {totalQuestions > 0 && currentQuestionIndex < totalQuestions && estimatedPrice === null && (
          <motion.div 
            className="w-full absolute left-0 top-0 px-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 overflow-hidden">
              <motion.div
                className="h-2"
                style={{ backgroundColor: theme.primary }}
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ 
                  duration: 0.7, 
                  ease: "easeOut",
                  delay: 0.3
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
      </motion.main>
    </motion.div>
  );
} 
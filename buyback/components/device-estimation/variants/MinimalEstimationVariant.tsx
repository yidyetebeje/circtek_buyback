"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { DeviceInformation, DeviceEstimationQuestion, ThemeColors, TranslatableText } from '@/types/shop';

interface MinimalEstimationVariantProps {
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
  handleAnswer: (questionId: string, value: string) => void;
  handleCheckout: () => void;
  handlePrevQuestion: () => void;
  handleNextQuestion: () => void;
}

const getLocalizedText = (textObj: TranslatableText | string | undefined, locale: string, defaultLocale: string): string => {
  if (!textObj) return '';
  if (typeof textObj === 'string') return textObj;
  return textObj[locale] || textObj[defaultLocale] || '';
};

export const MinimalEstimationVariant: React.FC<MinimalEstimationVariantProps> = ({ 
  initialDevice, questions, answers, currentQuestionIndex, totalQuestions,
  estimatedPrice, progress, theme, estimationResultTitle,
  checkoutButtonText, currentLocale, defaultLocale, handleAnswer, handleCheckout, 
  handlePrevQuestion, handleNextQuestion
}) => {
  
  // Get device name with proper typing
  const deviceName = typeof initialDevice.name === 'string' 
    ? initialDevice.name 
    : (initialDevice.name[currentLocale] || initialDevice.name[defaultLocale] || '');
  
  // Get current question
  const currentQuestion = questions[currentQuestionIndex];
  const questionText = currentQuestion?.text 
    ? (typeof currentQuestion.text === 'string' 
      ? currentQuestion.text 
      : (currentQuestion.text[currentLocale] || currentQuestion.text[defaultLocale] || ''))
    : '';
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
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

  // Function to render the current question or estimate result
  const renderContent = () => {
    if (estimatedPrice !== null) {
      // Render price estimate
      return (
        <motion.div 
          className="flex flex-col items-center space-y-8 w-full max-w-lg mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h2 
            className="text-2xl md:text-3xl font-bold text-center"
            variants={itemVariants}
          >
            {getLocalizedText(estimationResultTitle, currentLocale, defaultLocale) || 'Your Device Valuation'}
          </motion.h2>
          
          <motion.div 
            className="text-5xl md:text-6xl font-bold"
            style={{ color: theme.primary }}
            variants={itemVariants}
          >
            €{estimatedPrice}
          </motion.div>
          
          <motion.button
            onClick={handleCheckout}
            className="px-8 py-3 rounded-lg text-white font-medium text-lg"
            style={{ backgroundColor: theme.primary }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: `0 0 0 2px ${theme.primary}` 
            }}
            whileTap={{ scale: 0.98 }}
            variants={itemVariants}
          >
            {getLocalizedText(checkoutButtonText, currentLocale, defaultLocale) || 'Continue to Checkout'}
          </motion.button>
        </motion.div>
      );
    }
    
    // Otherwise, render the current question
    return (
      <div className="flex flex-col w-full mx-auto">
        {/* Device information and image container - fixed height */}
        <div className="relative w-full h-[240px] flex justify-center items-center mb-8">
          <motion.div 
            className="relative h-[220px] w-[220px]"
            variants={itemVariants}
          >
            {initialDevice.imageUrl && (
              <Image
                src={initialDevice.imageUrl}
                alt={deviceName}
                fill
                priority
                sizes="(max-width: 768px) 220px, 220px"
                className="object-contain"
              />
            )}
          </motion.div>
        </div>
        
        {/* Question container with fixed height to prevent layout shifts */}
        <div className="w-full min-h-[200px] flex flex-col justify-center items-center px-4">
          {/* Question text in a consistent container */}
          <div className="min-h-[80px] flex items-center justify-center w-full mb-6">
            <motion.h3 
              className="text-xl md:text-2xl font-medium text-center"
              variants={itemVariants}
            >
              {currentQuestionIndex + 1}. {questionText}
            </motion.h3>
          </div>
          
          {/* Options in a fixed-height container with consistent spacing */}
          {currentQuestion?.type === 'multiple-choice' && currentQuestion.options && (
            <motion.div 
              className="flex flex-wrap justify-center w-full min-h-[80px] mx-auto"
              variants={containerVariants}
            >
              {currentQuestion.options.map((option) => {
                const optionLabel = typeof option.label === 'string' 
                  ? option.label 
                  : (option.label[currentLocale] || option.label[defaultLocale] || '');
                const isSelected = answers[currentQuestion.id] === option.value;
                
                return (
                  <motion.button
                    key={option.value}
                    onClick={() => handleAnswer(currentQuestion.id, option.value)}
                    className="min-w-[100px] py-3 px-6 border bg-white rounded-md font-medium text-center relative overflow-hidden m-2"
                    style={{
                      color: isSelected ? 'white' : theme.text,
                      backgroundColor: isSelected ? theme.primary : 'white',
                      borderColor: isSelected ? theme.primary : '#e5e7eb',
                    }}
                    whileHover={{ 
                      boxShadow: `0 0 0 2px ${theme.primary}`,
                      borderColor: theme.primary,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.97 }}
                    variants={itemVariants}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Border fill animation */}
                    {!isSelected && (
                      <motion.div 
                        className="absolute inset-0 border-2 rounded-md pointer-events-none"
                        initial={{ opacity: 0, scale: 0 }}
                        whileHover={{ 
                          opacity: 1, 
                          scale: 1,
                          borderColor: theme.primary 
                        }}
                        style={{ borderColor: theme.primary }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                    
                    {optionLabel}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
          
          {/* Navigation Buttons */}
          <motion.div
            className="flex justify-between mt-6 w-full max-w-md mx-auto px-4"
            variants={containerVariants}
          >
            <motion.button
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${currentQuestionIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50 border border-gray-200'}`}
              whileHover={{ scale: currentQuestionIndex === 0 ? 1 : 1.05 }}
              whileTap={{ scale: currentQuestionIndex === 0 ? 1 : 0.95 }}
              variants={itemVariants}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>

            <motion.button
              onClick={handleNextQuestion}
              disabled={!answers[currentQuestion?.id]}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: answers[currentQuestion?.id] ? theme.primary : 'transparent',
                opacity: answers[currentQuestion?.id] ? 1 : 0.4,
                cursor: answers[currentQuestion?.id] ? 'pointer' : 'not-allowed',
                border: answers[currentQuestion?.id] ? 'none' : '1px solid #e5e7eb',
                color: answers[currentQuestion?.id] ? 'white' : 'currentColor'
              }}
              whileHover={{ 
                scale: answers[currentQuestion?.id] ? 1.05 : 1,
                boxShadow: answers[currentQuestion?.id] ? `0 0 0 4px ${theme.primary}20` : 'none'
              }}
              whileTap={{ scale: answers[currentQuestion?.id] ? 0.95 : 1 }}
              variants={itemVariants}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col justify-start"> 
      <motion.div 
        className="relative flex flex-col justify-start w-full max-w-4xl mx-auto px-4 md:px-6" 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Progress Bar - Full Width Without Text */}
        {totalQuestions > 0 && currentQuestionIndex < totalQuestions && estimatedPrice === null && (
          <motion.div 
            className="w-full absolute left-0 top-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 overflow-hidden">
              <motion.div
                className="h-1.5"
                style={{ backgroundColor: theme.primary }}
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
              />
            </div>
          </motion.div>
        )}
        
        {/* Main content container - Fixed width and height to prevent layout shifts */}
        <div className="flex items-start justify-center w-full pt-6">
          <motion.div 
            className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 overflow-hidden"
            variants={containerVariants}
            style={{ minHeight: '580px', height: 'auto' }}
          >
            {renderContent()}
          </motion.div>
        </div>
        
        {/* Device info at bottom */}
        {estimatedPrice === null && (
          <motion.div 
            className="text-center text-sm text-gray-500 dark:text-gray-400 py-4 border-t border-gray-200 dark:border-gray-700 w-full max-w-2xl mx-auto mt-2"
            variants={itemVariants}
          >
            <p>{deviceName} • {initialDevice.brandName}</p>
            {initialDevice.categoryName && (
              <p className="text-xs mt-1">{initialDevice.categoryName}</p>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

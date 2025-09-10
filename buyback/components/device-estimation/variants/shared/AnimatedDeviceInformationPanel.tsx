"use client";

import { motion } from "framer-motion";
import { DeviceInformation, DeviceEstimationQuestion, ThemeColors } from "@/types/shop";
import Image from "next/image";

interface AnimatedDeviceInformationPanelProps {
  deviceInfo: DeviceInformation;
  theme: ThemeColors;
  currentLocale: string;
  defaultLocale: string;
  questions?: DeviceEstimationQuestion[];
  answers?: Record<string, string>;
}

export function AnimatedDeviceInformationPanel({
  deviceInfo,
  theme,
  currentLocale,
  defaultLocale,
  questions,
  answers,
  imageSize = 'large' // 'small', 'medium', 'large'
}: AnimatedDeviceInformationPanelProps & { imageSize?: 'small' | 'medium' | 'large' }) {
  console.log(theme)
  // Handle translatable text with proper type checking
  const deviceName = typeof deviceInfo.name === 'string' 
    ? deviceInfo.name 
    : (deviceInfo.name[currentLocale] || deviceInfo.name[defaultLocale] || '');
  // Handle description with proper type checking and undefined check
  const deviceDescription = !deviceInfo.description ? '' : typeof deviceInfo.description === 'string'
    ? deviceInfo.description
    : (deviceInfo.description[currentLocale] || deviceInfo.description[defaultLocale] || '');

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6,
        staggerChildren: 0.15 
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
        damping: 20
      }
    }
  };

  const imageDimensions = {
    small: { width: 120, height: 120 },
    medium: { width: 180, height: 320 },
    large: { width: 240, height: 300 },
  };

  // Get answered questions and display them as features
  const answeredQuestions = questions && answers ? 
    questions.filter(q => answers[q.id]) : [];

  return (
    <motion.div 
      className="space-y-3 text-sm"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Device Image - Smaller */}
      {deviceInfo.imageUrl && (
        <motion.div 
          className="relative mx-auto overflow-hidden mb-2"
          style={{
            width: imageDimensions[imageSize].width,
            height: imageDimensions[imageSize].height,
          }}
          variants={itemVariants}
        >
          <Image 
            src={deviceInfo.imageUrl} 
            alt={deviceName} 
            fill
            priority
            className="object-fit rounded-md"
            sizes={`(max-width: 640px)  ${imageDimensions[imageSize].width}px, ${imageDimensions[imageSize].width}px`}
          />
        </motion.div>
      )}

      {/* Device Name - Plain Text */}
      <motion.h3 
        className="font-semibold text-gray-800 dark:text-white text-center"
        variants={itemVariants}
      >
        {deviceName}
      </motion.h3>

      {/* Device Description - Plain Text */}
      {deviceDescription && (
        <motion.p 
          className="text-xs text-gray-600 dark:text-gray-400 text-center"
          variants={itemVariants}
        >
          {deviceDescription}
        </motion.p>
      )}

      {/* Answered Questions Summary - Plain Text, smaller */}
      {answeredQuestions.length > 0 && (
        <motion.div className="pt-2 mt-2 space-y-1" variants={itemVariants}>
          <motion.ul className="space-y-1 text-xs">
            {answeredQuestions.map(question => {
              const questionText = typeof question.text === 'string'
                ? question.text
                : (question.text[currentLocale] || question.text[defaultLocale] || '');
              const answer = answers![question.id];
              const selectedOption = question.options?.find(opt => opt.value === answer);
              const optionLabel = selectedOption ? 
                (typeof selectedOption.label === 'string' 
                  ? selectedOption.label 
                  : (selectedOption.label[currentLocale] || selectedOption.label[defaultLocale] || ''))
                : answer;
              
              return (
                <motion.li 
                  key={question.id} 
                  className="text-gray-500 dark:text-gray-400 text-center"
                  variants={itemVariants}
                >
                  {/* Display format like 'Network: WiFi' */}
                  {questionText}: {optionLabel || answer}
                </motion.li>
              );
            })}
          </motion.ul>
        </motion.div>
      )}
    </motion.div>
  );
}

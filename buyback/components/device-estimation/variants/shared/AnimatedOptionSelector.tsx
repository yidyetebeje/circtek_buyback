"use client";

import { motion } from "framer-motion";
import { ThemeColors } from "@/types/shop";
import { useState } from "react";

export interface OptionSelectorProps {
  optionValue: string;
  optionLabel: string;
  optionDescription?: string;
  optionIcon?: string;
  isSelected: boolean;
  onClick: () => void;
  theme: ThemeColors;
}

// const getLocalizedText = (textObj: TranslatableText | string | undefined, locale: string, defaultLocale: string): string => {
//   if (!textObj) return '';
//   if (typeof textObj === 'string') return textObj;
//   return textObj[locale] || textObj[defaultLocale] || '';
// };

export function AnimatedOptionSelector({
  optionValue,
  optionLabel,
  optionDescription,
  optionIcon,
  isSelected,
  onClick,
  theme,
}: OptionSelectorProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.button
      key={optionValue}
      onClick={onClick}
      title={optionDescription || optionLabel}
      initial={{ scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 17,
        mass: 0.8
      }}
      className={`
        w-full sm:w-auto
        flex items-center justify-center py-3 px-6
        transition-all duration-150 ease-in-out focus:outline-none
        relative overflow-hidden min-w-[80px] 
        text-center rounded-md font-medium
      `}
      style={{
        backgroundColor: isSelected ? theme.primary : 'white',
        color: isSelected ? 'white' : theme.text,
        border: isSelected ? `1px solid ${theme.primary}` : '1px solid #e5e7eb'
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Border animation on hover */}
      {!isSelected && (
        <motion.div 
          className="absolute inset-0 pointer-events-none border rounded-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          style={{ borderColor: theme.primary, borderWidth: '1px' }}
          transition={{ duration: 0.2 }}
        />
      )}
      
      {isSelected && (
        <motion.div 
          className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
          </svg>
        </motion.div>
      )}
      
      {optionIcon && (
        <motion.span 
          className="text-2xl mb-2"
          animate={{ 
            y: isSelected ? -3 : 0,
            scale: isSelected ? 1.1 : 1 
          }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {optionIcon}
        </motion.span>
      )}
      
      <motion.span 
        className="text-sm font-medium leading-tight"
        animate={{ 
          fontWeight: isSelected ? 600 : 500 
        }}
      >
        {optionLabel}
      </motion.span>
      
      {optionDescription && (
        <motion.span 
          className="text-xs mt-1 text-gray-500 dark:text-gray-400"
          initial={{ opacity: 0, height: 0 }}
          animate={{ 
            opacity: isHovered || isSelected ? 1 : 0,
            height: isHovered || isSelected ? "auto" : 0,
            marginTop: isHovered || isSelected ? 4 : 0
          }}
          transition={{ duration: 0.2 }}
        >
          {optionDescription}
        </motion.span>
      )}
    </motion.button>
  );
}

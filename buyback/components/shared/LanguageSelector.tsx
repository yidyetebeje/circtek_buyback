"use client";

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

interface LanguageSelectorProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Style variant */
  variant?: 'minimal' | 'outlined' | 'filled';
  /** Show language name alongside flag */
  showName?: boolean;
  /** Show dropdown indicator */
  showChevron?: boolean;
  /** Custom class name */
  className?: string;
  /** Text color for styling */
  textColor?: string;
}

export function LanguageSelector({
  size = 'sm',
  variant = 'minimal',
  showName = false,
  showChevron = true,
  className = '',
  textColor
}: LanguageSelectorProps) {
  const { 
    availableLanguages, 
    currentLanguageObject, 
    changeLanguage, 
    getLanguageFlag,
    isLoading 
  } = useLanguage();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (languageCode: string) => {
    // Close dropdown first to prevent UI flicker during language change
    setIsOpen(false);
    
    // Use a small timeout to ensure the dropdown is closed before language change starts
    setTimeout(() => {
      // Only change if different from current
      if (languageCode !== currentLanguageObject?.code) {
        changeLanguage(languageCode);
      }
    }, 50);
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2'
  };

  // Variant classes
  const variantClasses = {
    minimal: 'bg-transparent border-none hover:bg-black/5',
    outlined: 'bg-transparent border border-gray-300 hover:border-gray-400',
    filled: 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
  };

  // Icon size based on size prop
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';

  // If no languages available, show loading state
  if (isLoading || availableLanguages.length === 0) {
    return (
      <div className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-md flex items-center justify-center ${className}`}>
        <GlobeAltIcon className={iconSize} />
      </div>
    );
  }

  const activeLanguages = availableLanguages.filter(lang => lang.isActive);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${sizeClasses[size]} 
          ${variantClasses[variant]} 
          rounded-md flex items-center gap-1 
          transition-all duration-200 
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          ${className}
        `}
        style={textColor ? { color: textColor } : {}}
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Flag */}
        <span className="flex-shrink-0">
          {currentLanguageObject?.flag || getLanguageFlag(currentLanguageObject?.code || 'en')}
        </span>
        
        {/* Language name/code */}
        {showName && currentLanguageObject && (
          <span className="font-medium">
            {size === 'sm' ? currentLanguageObject.code.toUpperCase() : currentLanguageObject.nativeName}
          </span>
        )}
        
        {!showName && (
          <span className="font-medium">
            {currentLanguageObject?.code.toUpperCase() || 'EN'}
          </span>
        )}
        
        {/* Dropdown indicator */}
        {showChevron && (
          <ChevronDownIcon 
            className={`${iconSize} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
          <div className="py-1" role="listbox">
            {activeLanguages.map((language) => (
              <button
                key={language.id}
                onClick={() => handleLanguageChange(language.code)}
                className={`
                  w-full text-left px-3 py-2 text-sm flex items-center gap-2
                  hover:bg-gray-100 transition-colors duration-150
                  ${currentLanguageObject?.code === language.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                `}
                role="option"
                aria-selected={currentLanguageObject?.code === language.code}
              >
                <span className="flex-shrink-0">
                  {language.flag || getLanguageFlag(language.code)}
                </span>
                <div className="flex flex-col">
                  <span className="font-medium">{language.nativeName}</span>
                  {language.name !== language.nativeName && (
                    <span className="text-xs text-gray-500">{language.name}</span>
                  )}
                </div>
                {currentLanguageObject?.code === language.code && (
                  <svg className="ml-auto h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback icons for when Heroicons is not available
const ChevronDownIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const GlobeAltIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
); 
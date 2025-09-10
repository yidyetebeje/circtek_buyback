"use client";

import { useEffect } from 'react';
import { Language } from '@/store/atoms';
import { useLanguage } from '@/hooks/useLanguage';

interface LanguageProviderProps {
  children: React.ReactNode;
}

/**
 * Language Provider Component
 * Initializes the language system and handles automatic language detection
 */
export function LanguageProvider({ children }: LanguageProviderProps) {
  const { 
    availableLanguages, 
    currentLanguage, 
    urlLocale,
    fetchLanguages, 
    detectUserLanguage,
    changeLanguage,
    isLoading 
  } = useLanguage();

  // Initialize language system on mount
  useEffect(() => {
    const initializeLanguages = async () => {
      if (availableLanguages.length === 0 && !isLoading) { 
        const languages = await fetchLanguages();
        // After fetching, if no language is set (e.g., first visit, no localStorage, no URL locale)
        // then detect and set. The useLanguage hook itself handles syncing from URL or localStorage.
        if (languages && languages.length > 0 && !currentLanguage) {
             // If urlLocale is valid and supported, useLanguage hook's sync effect should handle it.
             // If not, then detect.
            const isUrlLocaleValid = urlLocale && languages.some((lang: Language) => lang.code === urlLocale && lang.isActive);
            if (!isUrlLocaleValid) {
                const detected = detectUserLanguage;
                // Important: Check if detected is different before changing to avoid loop
                if (detected !== currentLanguage) {
                     changeLanguage(detected, { updateUrl: true }); // Ensure URL is updated if we auto-detect
                }
            }
        }
      }
    };
    initializeLanguages();
  }, [fetchLanguages, availableLanguages.length, isLoading, currentLanguage, urlLocale, detectUserLanguage, changeLanguage]);

  // Optional: Add location-based language detection - run only once when component mounts
  // Commenting this out as per the plan to streamline initialization and avoid conflicts.
  // This logic could be integrated into detectUserLanguage in the useLanguage hook if desired.
  /*
  useEffect(() => {
    let hasDetected = false; // Prevent multiple detections

    const detectLocationBasedLanguage = async () => {
      try {
        // Prevent multiple executions
        if (hasDetected) return;
        hasDetected = true;

        // Only detect if no language is already set
        if (currentLanguage) return;

        // Wait a bit to ensure availableLanguages are loaded
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to get user's location for more accurate language detection
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                // Use a geolocation service to get country code
                const response = await fetch(
                  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
                );
                
                if (response.ok) {
                  const locationData = await response.json();
                  const countryCode = locationData.countryCode?.toLowerCase();
                  
                  // Map country codes to language codes
                  const countryToLanguageMap: Record<string, string> = {
                    'nl': 'nl', // Netherlands -> Dutch
                    'be': 'nl', // Belgium -> Dutch (could also be French)
                    'de': 'de', // Germany -> German
                    'at': 'de', // Austria -> German
                    'ch': 'de', // Switzerland -> German (could also be French/Italian)
                    'fr': 'fr', // France -> French
                    'us': 'en', // United States -> English
                    'gb': 'en', // United Kingdom -> English
                    'ca': 'en', // Canada -> English (could also be French)
                    'au': 'en', // Australia -> English
                  };
                  
                  const suggestedLanguage = countryToLanguageMap[countryCode];
                  
                  if (suggestedLanguage && availableLanguages.some(lang => lang.code === suggestedLanguage && lang.isActive)) {
                    changeLanguage(suggestedLanguage);
                  }
                }
              } catch (error) {
                console.warn('Failed to detect location-based language:', error);
              }
            },
            () => {
              console.warn('Geolocation permission denied or failed');
            },
            { timeout: 5000, enableHighAccuracy: false }
          );
        }
      } catch (error) {
        console.warn('Language detection failed:', error);
      }
    };

    // Run location detection after a short delay to avoid conflicts
    const timeoutId = setTimeout(detectLocationBasedLanguage, 2000);
    
    return () => clearTimeout(timeoutId);
  }, []); // Remove all dependencies to run only once
  */

  return <>{children}</>;
}
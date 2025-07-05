'use client';


import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { saveLanguagePreference, PREF_KEYS } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from @/utils/appCache';

/**
 * Hook for managing language preferences
 * Uses Cognito attributes for persistence and AppCache for performance
 * 
 * @returns {Object} Language state and updater function
 */
export function useLanguagePreference() {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  // Load language from i18n on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        // First check AppCache for better performance
        const cachedLang = getCacheValue(`user_pref_${PREF_KEYS.LANGUAGE}`);
        
        if (cachedLang) {
          setLanguage(cachedLang);
          // Check if i18n needs to be updated
          if (i18n.language !== cachedLang) {
            await i18n.changeLanguage(cachedLang);
          }
        } else {
          // Already initialized by i18n's Cognito detector
          setLanguage(i18n.language);
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadLanguage();
  }, [i18n]);

  /**
   * Update language preference
   * 
   * @param {string} newLanguage - The language code to use
   * @returns {Promise<void>}
   */
  const updateLanguage = async (newLanguage) => {
    if (!newLanguage || newLanguage === language || isChanging) return;
    
    try {
      setIsChanging(true);
      
      // Update i18n immediately for better UX
      await i18n.changeLanguage(newLanguage);
      setLanguage(newLanguage);
      
      // Update AppCache immediately
      setCacheValue(`user_pref_${PREF_KEYS.LANGUAGE}`, newLanguage);
      
      // Save to Cognito (i18n language change listener will handle this)
      // This is done in i18n.js when language changes
    } catch (error) {
      console.error('Error updating language preference:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return {
    language,
    updateLanguage,
    isLoaded,
    isChanging,
    supportedLanguages: i18n.options.supportedLngs || [],
    currentLanguageName: getLanguageName(language)
  };
}

/**
 * Get the display name of a language
 * 
 * @param {string} langCode - The language code
 * @returns {string} The language display name
 */
function getLanguageName(langCode) {
  try {
    if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
      const languageNames = new Intl.DisplayNames([langCode], { type: 'language' });
      return languageNames.of(langCode);
    } else {
      // Fallback map for older browsers
      const langMap = {
        en: 'English',
        es: 'Español',
        fr: 'Français',
        de: 'Deutsch',
        it: 'Italiano',
        pt: 'Português',
        ja: 'Japanese',
        zh: 'Chinese',
        ru: 'Russian',
        ar: 'Arabic'
      };
      return langMap[langCode] || langCode;
    }
  } catch (e) {
    return langCode;
  }
} 
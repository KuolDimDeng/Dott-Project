'use client';


import { useState, useEffect } from 'react';
import { saveUserPreference, getUIDensityPreference, PREF_KEYS } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from @/utils/appCache';
import { logger } from '@/utils/logger';

/**
 * Valid UI density options
 */
export const DENSITY_OPTIONS = {
  COMPACT: 'compact',
  NORMAL: 'normal',
  COMFORTABLE: 'comfortable'
};

const DEFAULT_DENSITY = DENSITY_OPTIONS.NORMAL;
const CACHE_KEY = 'ui_density';

/**
 * Hook for managing UI density preferences
 * Uses Cognito attributes with AppCache for better performance
 * 
 * @returns {Object} UI density state and updater function
 */
export function useUIDensity() {
  const [density, setDensity] = useState(DEFAULT_DENSITY);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Load density preference on mount
  useEffect(() => {
    const loadDensity = async () => {
      try {
        // First check AppCache for better performance
        const cachedDensity = getCacheValue(CACHE_KEY);
        
        if (cachedDensity && Object.values(DENSITY_OPTIONS).includes(cachedDensity)) {
          setDensity(cachedDensity);
          applyDensityToDOM(cachedDensity);
          setIsLoaded(true);
          return;
        }
        
        // If not in cache, fetch from Cognito using our helper
        try {
          const cognitoDensity = await getUIDensityPreference(DEFAULT_DENSITY);
          
          if (cognitoDensity && Object.values(DENSITY_OPTIONS).includes(cognitoDensity)) {
            setDensity(cognitoDensity);
            applyDensityToDOM(cognitoDensity);
            // Update AppCache
            setCacheValue(CACHE_KEY, cognitoDensity);
          } else {
            // No valid preference or default returned, use our default
            setDensity(DEFAULT_DENSITY);
            applyDensityToDOM(DEFAULT_DENSITY);
            // Save default to Cognito and AppCache for future
            saveUserPreference(PREF_KEYS.UI_DENSITY, DEFAULT_DENSITY);
            setCacheValue(CACHE_KEY, DEFAULT_DENSITY);
          }
        } catch (apiError) {
          logger.error('Error fetching UI density preference from Cognito:', apiError);
          // API error, use default
          setDensity(DEFAULT_DENSITY);
          applyDensityToDOM(DEFAULT_DENSITY);
        }
      } catch (error) {
        logger.error('Error loading UI density preference:', error);
        applyDensityToDOM(DEFAULT_DENSITY);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadDensity();
  }, []);
  
  /**
   * Update the UI density preference
   * 
   * @param {string} newDensity - The new density value
   */
  const updateDensity = async (newDensity) => {
    if (!newDensity || !Object.values(DENSITY_OPTIONS).includes(newDensity)) {
      logger.error('Invalid density value:', newDensity);
      return;
    }
    
    try {
      // Update state immediately
      setDensity(newDensity);
      
      // Apply to DOM
      applyDensityToDOM(newDensity);
      
      // Update AppCache
      setCacheValue(CACHE_KEY, newDensity);
      
      // Save to Cognito
      await saveUserPreference(PREF_KEYS.UI_DENSITY, newDensity);
      
      logger.debug(`UI density updated to: ${newDensity}`);
    } catch (error) {
      logger.error('Error updating UI density preference:', error);
    }
  };
  
  /**
   * Apply the density class to the DOM
   * 
   * @param {string} densityValue - The density value to apply
   */
  const applyDensityToDOM = (densityValue) => {
    if (typeof document === 'undefined') return;
    
    // Remove existing density classes
    Object.values(DENSITY_OPTIONS).forEach(value => {
      document.documentElement.classList.remove(`ui-density-${value}`);
    });
    
    // Add new density class
    document.documentElement.classList.add(`ui-density-${densityValue}`);
  };
  
  return {
    density,
    updateDensity,
    isLoaded,
    DENSITY_OPTIONS
  };
} 
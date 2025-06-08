'use client';

import { useState, useEffect } from 'react';
import { saveUserPreference, getUIScalePreference, PREF_KEYS } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { logger } from '@/utils/logger';

// Valid UI scale values as percentages
const VALID_SCALES = ['75', '100', '125', '150'];
const DEFAULT_SCALE = '100';
const CACHE_KEY = 'ui_scale';

/**
 * Hook for managing UI scale preferences
 * Uses Cognito attributes with AppCache for better performance
 * 
 * @returns {Object} UI scale state and updater function
 */
export function useUIScale() {
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Load scale preference on mount
  useEffect(() => {
    const loadScale = async () => {
      try {
        // First check AppCache for better performance
        const cachedScale = getCacheValue(CACHE_KEY);
        
        if (cachedScale && VALID_SCALES.includes(cachedScale)) {
          setScale(cachedScale);
          applyScaleToDOM(cachedScale);
          setIsLoaded(true);
          return;
        }
        
        // If not in cache, fetch from Cognito using our helper
        try {
          const cognitoScale = await getUIScalePreference(DEFAULT_SCALE);
          
          if (cognitoScale && VALID_SCALES.includes(cognitoScale)) {
            setScale(cognitoScale);
            applyScaleToDOM(cognitoScale);
            // Update AppCache
            setCacheValue(CACHE_KEY, cognitoScale);
          } else {
            // No valid preference or default returned, use our default
            setScale(DEFAULT_SCALE);
            applyScaleToDOM(DEFAULT_SCALE);
            // Save default to Cognito and AppCache for future
            saveUserPreference(PREF_KEYS.UI_SCALE, DEFAULT_SCALE);
            setCacheValue(CACHE_KEY, DEFAULT_SCALE);
          }
        } catch (apiError) {
          logger.error('Error fetching UI scale preference from Cognito:', apiError);
          // API error, use default
          setScale(DEFAULT_SCALE);
          applyScaleToDOM(DEFAULT_SCALE);
        }
      } catch (error) {
        logger.error('Error loading UI scale preference:', error);
        applyScaleToDOM(DEFAULT_SCALE);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadScale();
  }, []);
  
  /**
   * Update the UI scale preference
   * 
   * @param {string} newScale - The new scale value (as percentage string)
   */
  const updateScale = async (newScale) => {
    if (!newScale || !VALID_SCALES.includes(newScale)) {
      logger.error('Invalid scale value:', newScale);
      return;
    }
    
    try {
      // Update state immediately
      setScale(newScale);
      
      // Apply to DOM
      applyScaleToDOM(newScale);
      
      // Update AppCache
      setCacheValue(CACHE_KEY, newScale);
      
      // Save to Cognito
      await saveUserPreference(PREF_KEYS.UI_SCALE, newScale);
      
      logger.debug(`UI scale updated to: ${newScale}`);
    } catch (error) {
      logger.error('Error updating UI scale preference:', error);
    }
  };
  
  /**
   * Apply the scale to the DOM
   * 
   * @param {string} scaleValue - The scale value to apply (as percentage string)
   */
  const applyScaleToDOM = (scaleValue) => {
    if (typeof document === 'undefined') return;
    
    // Apply scale using CSS custom property
    const scalePercent = parseInt(scaleValue, 10) / 100;
    document.documentElement.style.setProperty('--ui-scale', scalePercent.toString());
    
    // Also add class for other styling hooks
    // Remove existing scale classes
    VALID_SCALES.forEach(value => {
      document.documentElement.classList.remove(`ui-scale-${value}`);
    });
    
    // Add new scale class
    document.documentElement.classList.add(`ui-scale-${scaleValue}`);
  };
  
  return {
    scale,
    updateScale,
    isLoaded,
    validScales: VALID_SCALES
  };
} 
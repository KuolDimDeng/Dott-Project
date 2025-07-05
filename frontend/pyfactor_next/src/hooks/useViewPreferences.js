'use client';


import { useState, useEffect } from 'react';
import { saveUserPreference } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from @/utils/appCache';

/**
 * Custom hook for managing user's view preferences
 * Uses Cognito attributes for persistence and AppCache for performance
 * 
 * @param {Object} defaultPreferences - Default preferences object
 * @returns {Object} View preferences state and updater functions
 */
export function useViewPreferences(defaultPreferences = {}) {
  // Initialize with defaults merged with saved preferences
  const [preferences, setPreferences] = useState({
    tableView: defaultPreferences.tableView || 'cards',
    itemsPerPage: defaultPreferences.itemsPerPage || 10,
    sortField: defaultPreferences.sortField || 'updatedAt',
    sortDirection: defaultPreferences.sortDirection || 'desc',
    density: defaultPreferences.density || 'normal',
    ...defaultPreferences
  });
  
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Load saved preferences from Cognito/AppCache
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // For each preference, try to load from AppCache first, then Cognito
        const loadedPrefs = { ...preferences };
        let anyChanged = false;
        
        // Helper to load a specific preference
        const loadPreference = async (key) => {
          // First check AppCache
          const cachedValue = getCacheValue(`view_pref_${key}`);
          if (cachedValue !== null) {
            loadedPrefs[key] = cachedValue;
            return true;
          }
          
          // Then try Cognito via API
          try {
            const response = await fetch(`/api/user/preferences?key=view_${key}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.value !== undefined) {
                loadedPrefs[key] = data.value;
                // Store in AppCache for better performance
                setCacheValue(`view_pref_${key}`, data.value);
                return true;
              }
            }
          } catch (error) {
            console.error(`Error loading preference ${key}:`, error);
          }
          
          return false;
        };
        
        // Load each preference type
        for (const key of Object.keys(preferences)) {
          const changed = await loadPreference(key);
          anyChanged = anyChanged || changed;
        }
        
        // Update state if any preferences were loaded
        if (anyChanged) {
          setPreferences(loadedPrefs);
        }
      } catch (error) {
        console.error('Error loading view preferences:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadPreferences();
  }, []);
  
  // Update a single preference
  const updatePreference = async (key, value) => {
    // Update state immediately for better UX
    setPreferences(prev => ({ ...prev, [key]: value }));
    
    // Save to AppCache immediately
    setCacheValue(`view_pref_${key}`, value);
    
    try {
      // Save to Cognito for persistence
      await saveUserPreference(`custom:view_${key}`, String(value));
    } catch (error) {
      console.error(`Error saving preference ${key}:`, error);
    }
  };
  
  // Update multiple preferences at once
  const updatePreferences = async (newPrefs) => {
    // Update state immediately
    setPreferences(prev => ({ ...prev, ...newPrefs }));
    
    // Save each preference to AppCache
    Object.entries(newPrefs).forEach(([key, value]) => {
      setCacheValue(`view_pref_${key}`, value);
    });
    
    try {
      // Prepare Cognito attributes
      const attributes = {};
      Object.entries(newPrefs).forEach(([key, value]) => {
        attributes[`custom:view_${key}`] = String(value);
      });
      
      // Update user attributes in Cognito
      const response = await fetch('/api/user/update-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attributes })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error saving multiple preferences:', error);
    }
  };
  
  // Reset all preferences to defaults
  const resetPreferences = async () => {
    setPreferences({ ...defaultPreferences });
    
    try {
      // Clear AppCache entries
      Object.keys(preferences).forEach(key => {
        setCacheValue(`view_pref_${key}`, null);
      });
      
      // Clear Cognito attributes
      const attributes = {};
      Object.keys(preferences).forEach(key => {
        attributes[`custom:view_${key}`] = '';
      });
      
      await fetch('/api/user/update-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attributes, clear: true })
      });
    } catch (error) {
      console.error('Error resetting preferences:', error);
    }
  };
  
  return {
    preferences,
    updatePreference,
    updatePreferences,
    resetPreferences,
    isLoaded
  };
} 
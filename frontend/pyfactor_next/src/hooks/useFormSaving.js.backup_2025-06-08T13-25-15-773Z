'use client';

import { useState, useEffect } from 'react';
import { saveUserPreference } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

/**
 * Hook for managing form draft data using Cognito
 * Uses AppCache for better performance and failover storage
 * 
 * @param {string} formId - Unique identifier for the form
 * @param {Object} initialValues - Initial form values
 * @param {number} autoSaveInterval - Auto-save interval in milliseconds (default: 10000ms)
 * @returns {Object} Form saving utilities
 */
export function useFormSaving(formId, initialValues = {}, autoSaveInterval = 10000) {
  const [formValues, setFormValues] = useState(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [error, setError] = useState(null);
  
  // Load saved draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        // Generate a cache key for this form
        const cacheKey = `form_draft_${formId}`;
        
        // First check AppCache for better performance
        const cachedDraft = getCacheValue(cacheKey);
        
        if (cachedDraft) {
          setFormValues(cachedDraft);
          setHasSavedDraft(true);
          return;
        }
        
        // If not in cache, try to fetch from Cognito via API
        try {
          const response = await fetch(`/api/user/preferences?key=form_${formId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.value) {
              try {
                // Parse saved form values
                const savedValues = JSON.parse(data.value);
                setFormValues(savedValues);
                setHasSavedDraft(true);
                
                // Update AppCache
                setCacheValue(cacheKey, savedValues);
              } catch (parseError) {
                console.error(`Error parsing form draft data for ${formId}:`, parseError);
              }
            }
          }
        } catch (apiError) {
          console.error(`Error fetching form draft for ${formId}:`, apiError);
        }
      } catch (error) {
        console.error(`Error loading form draft for ${formId}:`, error);
        setError('Failed to load saved draft');
      }
    };
    
    if (formId) {
      loadDraft();
    }
  }, [formId]);
  
  // Save form draft
  const saveDraft = async (values = formValues) => {
    if (!formId) return false;
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Generate a cache key for this form
      const cacheKey = `form_draft_${formId}`;
      
      // Update AppCache immediately
      setCacheValue(cacheKey, values);
      
      // Save to Cognito
      await saveUserPreference(`custom:form_${formId}`, JSON.stringify(values));
      
      setLastSaved(new Date());
      setHasSavedDraft(true);
      
      return true;
    } catch (error) {
      console.error(`Error saving form draft for ${formId}:`, error);
      setError('Failed to save draft');
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Clear saved draft
  const clearDraft = async () => {
    if (!formId) return false;
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Generate a cache key for this form
      const cacheKey = `form_draft_${formId}`;
      
      // Clear from AppCache
      setCacheValue(cacheKey, null);
      
      // Clear from Cognito (save empty string)
      await saveUserPreference(`custom:form_${formId}`, '');
      
      setFormValues(initialValues);
      setHasSavedDraft(false);
      setLastSaved(null);
      
      return true;
    } catch (error) {
      console.error(`Error clearing form draft for ${formId}:`, error);
      setError('Failed to clear draft');
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Update form values
  const updateValues = (newValues) => {
    setFormValues(prev => ({
      ...prev,
      ...newValues
    }));
  };
  
  // Setup auto-save interval
  useEffect(() => {
    if (!formId || autoSaveInterval <= 0) return;
    
    const intervalId = setInterval(() => {
      if (Object.keys(formValues).length > 0 && !isSaving) {
        saveDraft(formValues);
      }
    }, autoSaveInterval);
    
    return () => clearInterval(intervalId);
  }, [formId, formValues, autoSaveInterval, isSaving]);
  
  return {
    formValues,
    updateValues,
    isSaving,
    lastSaved,
    hasSavedDraft,
    error,
    saveDraft,
    clearDraft
  };
} 
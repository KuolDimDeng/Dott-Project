'use client';


import { useState, useEffect } from 'react';
import { saveUserPreference, getUserPreference } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

const RECENT_ACTIVITY_LIMIT = 10;
const CACHE_KEY = 'recent_activity';
const COGNITO_KEY = 'custom:recent_activity';

/**
 * Hook for tracking recent user activity using Cognito attributes
 * Uses AppCache for better performance with occasional syncs to Cognito
 * 
 * @param {number} limit - Maximum number of items to track (default: 10)
 * @returns {Object} Recent activity utilities
 */
export function useRecentActivity(limit = RECENT_ACTIVITY_LIMIT) {
  const [recentItems, setRecentItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load recent activity on mount
  useEffect(() => {
    const loadRecentActivity = async () => {
      try {
        setIsLoading(true);
        
        // First check AppCache for better performance
        const cachedActivity = getCacheValue(CACHE_KEY);
        
        if (cachedActivity) {
          setRecentItems(cachedActivity.slice(0, limit));
          setIsLoading(false);
          
          // Still fetch from Cognito in background to ensure we have latest data
          try {
            const cognitoActivity = await getUserPreference(COGNITO_KEY);
            if (cognitoActivity) {
              const parsedActivity = JSON.parse(cognitoActivity);
              if (JSON.stringify(parsedActivity) !== JSON.stringify(cachedActivity)) {
                setRecentItems(parsedActivity.slice(0, limit));
                setCacheValue(CACHE_KEY, parsedActivity);
              }
            }
          } catch (backgroundError) {
            console.error('Background fetch error:', backgroundError);
          }
          
          return;
        }
        
        // If not in cache, fetch from Cognito
        const cognitoActivity = await getUserPreference(COGNITO_KEY);
        
        if (cognitoActivity) {
          try {
            const parsedActivity = JSON.parse(cognitoActivity);
            setRecentItems(parsedActivity.slice(0, limit));
            setCacheValue(CACHE_KEY, parsedActivity);
          } catch (parseError) {
            console.error('Error parsing recent activity:', parseError);
            setRecentItems([]);
          }
        } else {
          setRecentItems([]);
        }
        
      } catch (err) {
        console.error('Error loading recent activity:', err);
        setError('Failed to load recent activity');
        setRecentItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRecentActivity();
  }, [limit]);
  
  // Add item to recent activity
  const addItem = async (item) => {
    if (!item || !item.id) {
      console.error('Invalid item: must have an id property');
      return false;
    }
    
    try {
      // Create a new array with the new item at the front
      const newItems = [
        { 
          ...item, 
          timestamp: Date.now() 
        },
        ...recentItems.filter(existing => existing.id !== item.id)
      ].slice(0, limit);
      
      // Update local state
      setRecentItems(newItems);
      
      // Update AppCache immediately
      setCacheValue(CACHE_KEY, newItems);
      
      // Save to Cognito
      await saveUserPreference(COGNITO_KEY, JSON.stringify(newItems));
      
      return true;
    } catch (err) {
      console.error('Error adding recent activity item:', err);
      setError('Failed to update recent activity');
      return false;
    }
  };
  
  // Remove item from recent activity
  const removeItem = async (itemId) => {
    try {
      // Filter out the item to remove
      const newItems = recentItems.filter(item => item.id !== itemId);
      
      // Update local state
      setRecentItems(newItems);
      
      // Update AppCache immediately
      setCacheValue(CACHE_KEY, newItems);
      
      // Save to Cognito
      await saveUserPreference(COGNITO_KEY, JSON.stringify(newItems));
      
      return true;
    } catch (err) {
      console.error('Error removing recent activity item:', err);
      setError('Failed to update recent activity');
      return false;
    }
  };
  
  // Clear all recent activity
  const clearAll = async () => {
    try {
      // Update local state
      setRecentItems([]);
      
      // Update AppCache immediately
      setCacheValue(CACHE_KEY, []);
      
      // Save to Cognito
      await saveUserPreference(COGNITO_KEY, JSON.stringify([]));
      
      return true;
    } catch (err) {
      console.error('Error clearing recent activity:', err);
      setError('Failed to clear recent activity');
      return false;
    }
  };
  
  return {
    recentItems,
    isLoading,
    error,
    addItem,
    removeItem,
    clearAll
  };
} 
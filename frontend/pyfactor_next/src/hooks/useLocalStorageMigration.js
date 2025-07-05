'use client';

import { appCache } from '@/utils/appCache';


import { useState, useEffect } from 'react';
import { isAllMigrationsComplete, markAllMigrationsComplete } from '@/utils/migrationCompletionCheck';
import { migrateLegacyPreferences } from '@/utils/migrateLegacyPreferences';
import { migrateUIPreferences } from '@/utils/migrateUIPreferences';

/**
 * Hook to check and manage migration status from localStorage to Cognito
 * 
 * @returns {Object} Migration state and utility functions
 */
export function useLocalStorageMigration() {
  const [isMigrated, setIsMigrated] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState(null);
  
  // Check migration status on mount
  useEffect(() => {
    const checkMigrationStatus = async () => {
      try {
        // Check AppCache first for better performance
        const cachedStatus = getCacheValue('all_migrations_complete');
        if (cachedStatus === true) {
          setIsMigrated(true);
          return;
        }
        
        // Check actual migration status
        const allComplete = await isAllMigrationsComplete();
        setIsMigrated(allComplete);
        
        // Update AppCache
        if (allComplete) {
          setCacheValue('all_migrations_complete', true);
        }
      } catch (error) {
        console.error('Error checking migration status:', error);
        setError('Failed to check migration status');
      }
    };
    
    checkMigrationStatus();
  }, []);
  
  /**
   * Run all migrations manually
   * 
   * @returns {Promise<boolean>} True if migration was successful
   */
  const runAllMigrations = async () => {
    try {
      setIsMigrating(true);
      setError(null);
      
      // Run legacy migrations
      const legacySuccess = await migrateLegacyPreferences();
      if (!legacySuccess) {
        throw new Error('Failed to migrate legacy preferences');
      }
      
      // Run UI migrations
      const uiSuccess = await migrateUIPreferences();
      if (!uiSuccess) {
        throw new Error('Failed to migrate UI preferences');
      }
      
      // Mark all migrations as complete
      await markAllMigrationsComplete();
      
      // Update state and cache
      setIsMigrated(true);
      setCacheValue('all_migrations_complete', true);
      
      return true;
    } catch (error) {
      console.error('Error running migrations:', error);
      setError(error.message || 'Failed to migrate preferences');
      return false;
    } finally {
      setIsMigrating(false);
    }
  };
  
  /**
   * Clear migration markers to force re-migration
   * 
   * @returns {Promise<boolean>} True if successful
   */
  const resetMigrationStatus = async () => {
    try {
      // Clear AppCache markers
      setCacheValue('all_migrations_complete', null);
      setCacheValue('migration_preferences_migrated', null);
      setCacheValue('migration_ui_preferences_migrated', null);
      setCacheValue('migration_auth_preferences_migrated', null);
      
      // Clear global AppCache markers if they exist
      if (typeof window !== 'undefined' && appCache.getAll()) {
        if (appCache.getAll().migration) {
          delete appCache.get('migration.completed');
          delete appCache.get('migration.preferences');
          delete appCache.get('migration.ui');
          delete appCache.get('migration.auth');
        }
      }
      
      // Reset state
      setIsMigrated(false);
      setError(null);
      
      return true;
    } catch (error) {
      console.error('Error resetting migration status:', error);
      setError('Failed to reset migration status');
      return false;
    }
  };
  
  return {
    isMigrated,
    isMigrating,
    error,
    runAllMigrations,
    resetMigrationStatus
  };
} 
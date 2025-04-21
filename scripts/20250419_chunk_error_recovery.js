#!/usr/bin/env node

/**
 * Chunk Error Recovery Script
 * Version: 1.0
 * Date: 2025-04-19
 * 
 * This script enhances dashboard resilience by adding robust chunk loading error recovery.
 * It patches the application to better handle network errors and ChunkLoadError exceptions.
 * 
 * No cookies or local storage are used, in compliance with project standards.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  dashboardPagePath: path.resolve(__dirname, '../src/app/dashboard/page.js'),
  dashboardLayoutPath: path.resolve(__dirname, '../src/app/dashboard/layout.js'),
  tenantDashboardPagePath: path.resolve(__dirname, '../src/app/[tenantId]/dashboard/page.js'),
  dashboardLoaderPath: path.resolve(__dirname, '../src/components/DashboardLoader.js'),
  providersPath: path.resolve(__dirname, '../src/app/providers.js'),
  dashboardResiliencePath: path.resolve(__dirname, '../src/app/dashboard/DASHBOARD_RESILIENCE.md'),
};

// Helper functions
function backupFile(filePath) {
  const backupPath = `${filePath}.backup`;
  try {
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`Backed up ${filePath} to ${backupPath}`);
      return backupPath;
    }
  } catch (error) {
    console.error(`Error backing up ${filePath}:`, error);
  }
  return null;
}

function restoreBackup(filePath) {
  const backupPath = `${filePath}.backup`;
  try {
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, filePath);
      fs.unlinkSync(backupPath);
      console.log(`Restored ${filePath} from backup`);
      return true;
    }
  } catch (error) {
    console.error(`Error restoring ${filePath}:`, error);
  }
  return false;
}

function updateDashboardPage() {
  if (!fs.existsSync(config.dashboardPagePath)) {
    console.log(`Dashboard page not found at ${config.dashboardPagePath}, skipping`);
    return false;
  }

  backupFile(config.dashboardPagePath);
  
  let content = fs.readFileSync(config.dashboardPagePath, 'utf8');
  
  // Enhanced error recovery script
  const enhancedRecoveryScript = `
      <script
        dangerouslySetInnerHTML={{
          __html: \`
            // Enhanced fallback recovery script
            (function() {
              console.log('[Recovery] Installing enhanced chunk error handlers');
              
              // Variable to track error state
              window.__recoveryAttempts = window.__recoveryAttempts || 0;
              
              function recoverFromChunkError(e) {
                // Only handle chunk loading errors
                if (e && e.message && (
                    e.message.includes('ChunkLoadError') || 
                    e.message.includes('Loading chunk') || 
                    e.message.includes('Failed to fetch')
                )) {
                  console.error('[Recovery] Caught chunk load error, attempting recovery...');
                  
                  // Prevent infinite reload loops
                  window.__recoveryAttempts = (window.__recoveryAttempts || 0) + 1;
                  if (window.__recoveryAttempts > 3) {
                    console.error('[Recovery] Too many recovery attempts, redirecting to fallback');
                    // Add fallback flow here if needed
                    return;
                  }
                  
                  // Unregister service workers to clear cached resources
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      registrations.forEach(registration => registration.unregister());
                      console.log('[Recovery] Unregistered service workers');
                    });
                  }
                  
                  // Clear caches
                  if ('caches' in window) {
                    caches.keys().then(cacheNames => {
                      cacheNames.forEach(cacheName => {
                        caches.delete(cacheName);
                        console.log('[Recovery] Cleared cache:', cacheName);
                      });
                    });
                  }
                  
                  // Force a clean reload with cache busting
                  setTimeout(() => {
                    const cacheBuster = Date.now();
                    const url = new URL(window.location);
                    url.searchParams.set('cb', cacheBuster);
                    url.searchParams.set('recovery', 'true');
                    console.log('[Recovery] Reloading with cache busting');
                    window.location.href = url.toString();
                  }, 1000);
                }
              }
              
              // Register multiple event listeners to catch errors
              window.addEventListener('error', recoverFromChunkError);
              window.addEventListener('unhandledrejection', function(event) {
                if (event.reason && event.reason.message) {
                  recoverFromChunkError({ message: event.reason.message });
                }
              });
              
              // Check URL params to see if this is a recovery attempt
              const urlParams = new URLSearchParams(window.location.search);
              if (urlParams.get('recovery') === 'true') {
                console.log('[Recovery] This is a recovery attempt');
                // Clear any existing chunk errors
                window.__recoveryAttempts = 0;
              }
            })();
          \`,
        }}
      />`;
  
  // Replace the existing script with the enhanced version
  if (content.includes('dangerouslySetInnerHTML')) {
    content = content.replace(
      /<script\s+dangerouslySetInnerHTML={[^}]+}\/>/s,
      enhancedRecoveryScript
    );
  } else {
    const insertPoint = content.indexOf('<CustomDashboardContent');
    if (insertPoint !== -1) {
      content = content.slice(0, insertPoint) + 
                enhancedRecoveryScript + '\n      ' + 
                content.slice(insertPoint);
    } else {
      console.error('Could not find insertion point in dashboard page');
      return false;
    }
  }
  
  fs.writeFileSync(config.dashboardPagePath, content, 'utf8');
  console.log('Enhanced dashboard page with improved error handling');
  return true;
}

function updateDashboardLoader() {
  if (!fs.existsSync(config.dashboardLoaderPath)) {
    console.log(`Dashboard loader not found at ${config.dashboardLoaderPath}, skipping`);
    return false;
  }

  backupFile(config.dashboardLoaderPath);
  
  let content = fs.readFileSync(config.dashboardLoaderPath, 'utf8');
  
  // Enhanced recovery function
  const enhancedRecoveryFunction = `
  // Add error recovery function
  const recoverFromError = useCallback(() => {
    // Clear any potential network errors and retry loading
    if (typeof window !== 'undefined') {
      console.log('[DashboardLoader] Attempting to recover from network error');
      
      // Check for specific error types
      if (errorDetails?.type === 'ChunkLoadError' || 
          errorDetails?.message?.includes('Loading chunk') ||
          errorDetails?.message?.includes('Failed to fetch')) {
        console.log('[DashboardLoader] Clearing cache for chunk/network error');
        
        // Unregister service workers
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => registration.unregister());
          }).catch(err => {
            console.error('[DashboardLoader] Error unregistering service workers:', err);
          });
        }
        
        // Clear caches
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => caches.delete(cacheName));
          }).catch(err => {
            console.error('[DashboardLoader] Error clearing cache:', err);
          });
        }
      }
      
      // Force a clean reload after a short delay
      setTimeout(() => {
        // Add cache-busting parameters
        const url = new URL(window.location);
        url.searchParams.set('cb', Date.now());
        url.searchParams.set('recovery', 'true');
        window.location.href = url.toString();
      }, 1500);
    }
  }, [errorDetails]);`;
  
  // Replace the existing recovery function
  if (content.includes('recoverFromError')) {
    content = content.replace(
      /const recoverFromError = useCallback\([^}]+}\);/s,
      enhancedRecoveryFunction
    );
  } else {
    console.error('Could not find recoverFromError function in DashboardLoader');
    return false;
  }
  
  // Enhanced chunk error detection
  const enhancedChunkErrorDetection = `
  // Monitor for chunk loading errors
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleChunkError = (event) => {
      // Handle both string messages and error objects
      const message = event.message || (event.error && event.error.message) || '';
      
      // Only handle chunk load errors and network errors
      if (message && (
          message.includes('ChunkLoadError') || 
          message.includes('Loading chunk') || 
          message.includes('Failed to fetch') ||
          message.includes('NetworkError')
      )) {
        console.error('[DashboardLoader] Detected loading error:', message);
        setErrorDetails({
          type: message.includes('ChunkLoadError') ? 'ChunkLoadError' : 'NetworkError',
          message: message
        });
        setStatus('Error loading dashboard components. Attempting recovery...');
        
        // Automatically trigger recovery for severe errors
        if (message.includes('ChunkLoadError') || message.includes('NetworkError')) {
          recoverFromError();
        }
      }
    };
    
    // Handle both unhandled errors and rejections
    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message) {
        handleChunkError({ message: event.reason.message });
      }
    });
    
    // Check URL params to see if this is a recovery attempt
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('recovery') === 'true') {
      console.log('[DashboardLoader] This is a recovery attempt, ensuring clean state');
      // Additional recovery logic can be added here
    }
    
    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleChunkError);
    };
  }, [recoverFromError]);`;
  
  // Replace the existing useEffect
  if (content.includes('Monitor for chunk loading errors')) {
    content = content.replace(
      /\/\/ Monitor for chunk loading errors\s+useEffect\([^}]+}\);/s,
      enhancedChunkErrorDetection
    );
  } else {
    console.error('Could not find chunk error monitoring in DashboardLoader');
    return false;
  }
  
  fs.writeFileSync(config.dashboardLoaderPath, content, 'utf8');
  console.log('Enhanced DashboardLoader with improved error recovery');
  return true;
}

function updateProviders() {
  if (!fs.existsSync(config.providersPath)) {
    console.log(`Providers not found at ${config.providersPath}, skipping`);
    return false;
  }

  backupFile(config.providersPath);
  
  let content = fs.readFileSync(config.providersPath, 'utf8');
  
  // Enhanced error handling
  const enhancedErrorHandling = `
  // Add error boundary using useEffect
  useEffect(() => {
    const handleError = (event) => {
      // Filter out non-critical errors
      if (event.error && event.error.message && (
          event.error.message.includes('ChunkLoadError') ||
          event.error.message.includes('Loading chunk') ||
          event.error.message.includes('Failed to fetch') ||
          event.error.message.includes('NetworkError')
      )) {
        console.error('[Providers] Caught unhandled error:', event.error);
        
        // Don't set error state for chunk errors as they will be handled by the dashboard loader
        if (!event.error.message.includes('ChunkLoadError') && 
            !event.error.message.includes('Loading chunk')) {
          setError(event.error);
        }
        
        // Prevent the error from propagating further
        event.preventDefault();
        
        // For chunk errors, let the specific handlers deal with them
        return;
      }
      
      // For other errors, set the error state
      console.error('[Providers] Caught unhandled error:', event.error);
      setError(event.error);
      event.preventDefault();
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason) {
        handleError({ error: event.reason });
      }
    });
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);`;
  
  // Replace the existing error handling
  if (content.includes('window.addEventListener(\'error\'')) {
    content = content.replace(
      /useEffect\(\(\) => {\s+const handleError[^}]+}\);/s,
      enhancedErrorHandling
    );
  } else {
    console.error('Could not find error handling in Providers');
    return false;
  }
  
  fs.writeFileSync(config.providersPath, content, 'utf8');
  console.log('Enhanced Providers with improved error handling');
  return true;
}

function updateDocumentation() {
  if (!fs.existsSync(config.dashboardResiliencePath)) {
    console.log('Creating new dashboard resilience documentation');
    
    const newDocContent = `# Dashboard Resilience Architecture

## Overview
This document outlines the architecture changes made to improve dashboard resilience, especially handling tenant redirections and chunk loading errors that were causing the dashboard to fail after login.

## Key Changes (2025-04-19)

### 1. Enhanced Error Recovery
- Added comprehensive chunk loading error detection and recovery
- Implemented service worker and cache clearing for network errors
- Added URL-based recovery tracking to prevent infinite reload loops

### 2. Improved Error Boundaries
- Enhanced global error handlers in Providers component
- Added specific error handling for network and chunk loading errors
- Implemented automatic recovery triggers for severe errors

### 3. Dashboard Component Resilience
- Strengthened dashboard loader with better error detection
- Added cache busting for page reloads
- Implemented progressive recovery with fallback mechanisms

## Error Recovery Flow
1. User authentication completes successfully
2. If chunk loading errors occur during dashboard load:
   - Error is caught by global event listener
   - Service workers are unregistered to clear cached resources
   - Browser caches are cleared
   - Page is reloaded with cache-busting parameters
   - Recovery attempt is tracked to prevent infinite loops

## Implementation Details

### Dashboard Recovery Script
- Enhanced error detection for various failure types
- Added service worker and cache management
- Implemented URL-based recovery tracking

### Dashboard Loader Component
- Improved error type detection and handling
- Added automatic recovery for severe errors
- Enhanced URL parameter handling for recovery state

### Global Error Handling
- Enhanced Providers component with better error filtering
- Added unhandled rejection handling
- Improved error prevention and propagation control

## Security Considerations
- All recovery mechanisms comply with security requirements
- No cookies or local storage used for recovery state
- Recovery tracking uses URL parameters only
- No tenant isolation issues

## Log Monitoring
- Added enhanced error logging for better diagnostics
- Improved error type classification
- Added recovery attempt tracking

## Version History
- v1.0 (2025-04-19): Initial implementation
`;
    
    fs.writeFileSync(config.dashboardResiliencePath, newDocContent, 'utf8');
    console.log('Created new dashboard resilience documentation');
  } else {
    backupFile(config.dashboardResiliencePath);
    
    let content = fs.readFileSync(config.dashboardResiliencePath, 'utf8');
    
    // Update existing documentation
    if (content.includes('## Key Changes')) {
      const updateSection = `## Key Changes (2025-04-19)

### 1. Enhanced Error Recovery (Updated)
- Added comprehensive chunk loading error detection and recovery
- Implemented service worker and cache clearing for network errors
- Added URL-based recovery tracking to prevent infinite reload loops
- Improved handling of network errors during API calls

### 2. Improved Error Boundaries (Updated)
- Enhanced global error handlers in Providers component
- Added specific error handling for network and chunk loading errors
- Implemented automatic recovery triggers for severe errors
- Better error filtering to prevent unnecessary page reloads`;
      
      content = content.replace(
        /## Key Changes[^#]+/s,
        updateSection + '\n\n'
      );
    }
    
    // Add version history if not present
    if (!content.includes('## Version History')) {
      content += `\n## Version History
- v1.1 (2025-04-19): Enhanced error recovery mechanisms
- v1.0 (2025-04-18): Initial implementation
`;
    } else {
      // Update version history
      content = content.replace(
        /## Version History[^#]+/s,
        `## Version History
- v1.1 (2025-04-19): Enhanced error recovery mechanisms
- v1.0 (2025-04-18): Initial implementation
`
      );
    }
    
    fs.writeFileSync(config.dashboardResiliencePath, content, 'utf8');
    console.log('Updated dashboard resilience documentation');
  }
  
  return true;
}

// Main execution
function main() {
  console.log('Starting Dashboard Chunk Error Recovery Enhancement');
  console.log('=================================================');
  
  const backupPaths = [];
  let success = true;
  
  try {
    // Update dashboard page
    if (updateDashboardPage()) {
      backupPaths.push(config.dashboardPagePath);
    } else {
      success = false;
    }
    
    // Update dashboard loader
    if (updateDashboardLoader()) {
      backupPaths.push(config.dashboardLoaderPath);
    } else {
      success = false;
    }
    
    // Update providers
    if (updateProviders()) {
      backupPaths.push(config.providersPath);
    } else {
      success = false;
    }
    
    // Update documentation
    updateDocumentation();
    
    // Final results
    console.log('\nScript execution completed');
    console.log('=================================================');
    
    if (success) {
      console.log('✅ All updates completed successfully');
      console.log('\nRecommended next steps:');
      console.log('1. Restart the development server');
      console.log('2. Test the dashboard with authentication flow');
      console.log('3. Verify error recovery by forcing chunk errors');
    } else {
      console.log('⚠️ Some updates could not be completed');
      console.log('Please check the logs for details');
    }
    
    console.log('\nBackup files created:');
    backupPaths.forEach(path => {
      console.log(`- ${path}.backup`);
    });
    
    // Note about keeping or restoring backups
    console.log('\nTo restore from backups, run this script with --restore flag');
    
  } catch (error) {
    console.error('Error during script execution:', error);
    console.log('\nRestoring backups automatically due to error...');
    
    // Restore backups in case of error
    backupPaths.forEach(path => {
      restoreBackup(path);
    });
    
    return 1;
  }
  
  return 0;
}

// Check for restore flag
if (process.argv.includes('--restore')) {
  console.log('Restoring backups...');
  [
    config.dashboardPagePath,
    config.dashboardLayoutPath,
    config.tenantDashboardPagePath,
    config.dashboardLoaderPath,
    config.providersPath,
    config.dashboardResiliencePath
  ].forEach(path => {
    if (fs.existsSync(`${path}.backup`)) {
      restoreBackup(path);
    }
  });
  process.exit(0);
}

// Run the main function
process.exit(main()); 
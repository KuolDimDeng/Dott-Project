'use client';

/**
 * Utility to help debug import issues in Next.js
 * 
 * This file provides helpers to safely handle dynamic imports
 * and avoid common issues with server-only modules in client components.
 */

import { logger } from './logger';

/**
 * Safely attempt to import a module with proper error handling
 * @param {Function} importFn - Function that returns a dynamic import promise
 * @param {string} moduleName - Name of the module for logging
 * @param {any} fallback - Fallback value if import fails
 * @returns {Promise<any>} The imported module or fallback
 */
export async function safeImport(importFn, moduleName, fallback = null) {
  try {
    // Only perform dynamic imports on client side
    if (typeof window === 'undefined') {
      logger.warn(`[ImportDebugger] Attempted server-side import of ${moduleName}`);
      return fallback;
    }
    
    // Execute the import function
    const result = await importFn();
    logger.debug(`[ImportDebugger] Successfully imported ${moduleName}`);
    return result;
  } catch (error) {
    logger.error(`[ImportDebugger] Failed to import ${moduleName}:`, error);
    return fallback;
  }
}

/**
 * Safely import a specific export from a module
 * @param {string} modulePath - Path to the module
 * @param {string} exportName - Name of the export to import
 * @param {any} fallback - Fallback value if import fails
 * @returns {Promise<any>} The imported export or fallback
 */
export async function safeImportExport(modulePath, exportName, fallback = null) {
  return safeImport(
    () => import(modulePath).then(module => module[exportName]),
    `${modulePath}#${exportName}`,
    fallback
  );
}

/**
 * Check if code is running in a browser environment
 * @returns {boolean} True if running in browser
 */
export function isBrowser() {
  return typeof window !== 'undefined';
}

/**
 * Check if code is running on server
 * @returns {boolean} True if running on server
 */
export function isServer() {
  return typeof window === 'undefined';
}

/**
 * A component wrapper that ensures content only renders on client
 * @param {ReactNode} children - Child components
 * @returns {ReactNode} Children or null based on environment
 */
export function ClientOnly({ children }) {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  return children;
}

/**
 * Create a server-safe version of a function that requires browser APIs
 * @param {Function} fn - The function to make server-safe
 * @param {any} fallbackValue - Fallback return value for server context
 * @returns {Function} Server-safe function
 */
export function serverSafe(fn, fallbackValue = null) {
  return (...args) => {
    if (isServer()) {
      return fallbackValue;
    }
    return fn(...args);
  };
}
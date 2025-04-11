'use client';

/**
 * Simplified debug utility with no-op functions
 * This version removes all the monkey patching and complex debugging
 * to avoid rendering issues
 */

// No-op functions that do nothing
export function setupContextDebugging() {
  // No-op function
  console.log('[DEBUG] Context debugging disabled');
}

export function inspectContexts() {
  // No-op function
  console.log('[DEBUG] Context inspection disabled');
}

export function withDebugger(Component) {
  // Simply return the component without wrapping
  return Component;
}

// Export debug state for external access
export const getDebugState = () => ({});

// Helper for logging
export function debugLog(level, message, data = {}) {
  const prefix = `[${level.toUpperCase()}]`;
  
  if (level === 'error') {
    console.error(prefix, message, data);
  } else {
    console.log(prefix, message, data);
  }
}

export default {
  setupContextDebugging,
  inspectContexts,
  withDebugger,
  getDebugState
};
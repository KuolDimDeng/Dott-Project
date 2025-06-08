'use client';


/**
 * Simplified debug utility for dynamic imports
 * This version removes all the monkey patching and complex debugging
 * to avoid rendering issues
 */

// No-op function that does nothing
export function setupDynamicImportDebugging() {
  console.log('[DEBUG] Dynamic import debugging disabled');
}

// Helper to wrap a component with error boundary - simplified version
export function withDynamicErrorBoundary(Component) {
  // Simply return the component without wrapping
  return Component;
}

export default {
  setupDynamicImportDebugging,
  withDynamicErrorBoundary,
  getTracker: () => ({})
};
/**
 * Memory Manager Utility
 * 
 * Comprehensive memory management for Next.js applications.
 * Prevents memory leaks and optimizes resource usage.
 */

import { useEffect, useRef, useState } from 'react';

// Store weak references to large objects to allow garbage collection
const weakCache = new WeakMap();

// Track components for memory usage
const componentMemory = new Map();

// Store disposable resources that need cleanup
const disposables = new Set();

// Memory history for tracking
let memoryHistory = [];
const MAX_HISTORY_SIZE = 100;

/**
 * Get current memory usage
 * @returns {Object|null} Memory usage data or null if not supported
 */
export const getMemoryUsage = () => {
  if (typeof window !== 'undefined' && 
      window.performance && 
      window.performance.memory) {
    const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = window.performance.memory;
    
    return {
      jsHeapSizeLimit: formatMemory(jsHeapSizeLimit),
      totalJSHeapSize: formatMemory(totalJSHeapSize),
      usedJSHeapSize: formatMemory(usedJSHeapSize),
      usagePercentage: Math.round((usedJSHeapSize / jsHeapSizeLimit) * 100)
    };
  }
  
  return null;
};

/**
 * Format memory size into human-readable format
 * @param {number} bytes - Memory size in bytes
 * @returns {string} Formatted memory size
 */
export const formatMemory = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

/**
 * Track component memory usage
 * @param {string} component - Component name
 * @param {string} action - Action (mount, update, unmount)
 */
export const trackMemory = (component, action) => {
  if (typeof window === 'undefined' || 
      !window.performance || 
      !window.performance.memory) {
    return;
  }
  
  const memory = window.performance.memory;
  const timestamp = new Date().toISOString();
  
  // Store memory data
  const entry = {
    component,
    action,
    timestamp,
    usedJSHeapSize: formatMemory(memory.usedJSHeapSize),
    totalJSHeapSize: formatMemory(memory.totalJSHeapSize),
    rawUsed: memory.usedJSHeapSize,
    rawTotal: memory.totalJSHeapSize
  };
  
  // Add to history with limited size
  memoryHistory.push(entry);
  if (memoryHistory.length > MAX_HISTORY_SIZE) {
    memoryHistory = memoryHistory.slice(-MAX_HISTORY_SIZE);
  }
  
  // Store in component tracking
  if (!componentMemory.has(component)) {
    componentMemory.set(component, []);
  }
  
  const componentHistory = componentMemory.get(component);
  componentHistory.push(entry);
  
  // Limit component history size
  if (componentHistory.length > 20) {
    componentHistory.shift();
  }
};

/**
 * Detect potential memory leaks
 * @returns {Array} List of potential memory leaks
 */
export const detectMemoryLeaks = () => {
  const potentialLeaks = [];
  
  componentMemory.forEach((history, component) => {
    if (history.length < 5) return; // Need at least 5 entries
    
    // Sort by timestamp
    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    const firstEntry = sortedHistory[0];
    const lastEntry = sortedHistory[sortedHistory.length - 1];
    
    // Compare memory usage
    if (lastEntry.rawUsed > firstEntry.rawUsed) {
      const increase = ((lastEntry.rawUsed - firstEntry.rawUsed) / firstEntry.rawUsed) * 100;
      
      if (increase > 20) { // 20% increase threshold
        potentialLeaks.push({
          component,
          increase: `${increase.toFixed(2)}%`,
          firstMemory: firstEntry.usedJSHeapSize,
          lastMemory: lastEntry.usedJSHeapSize,
          timePeriod: `${new Date(firstEntry.timestamp).toLocaleTimeString()} - ${new Date(lastEntry.timestamp).toLocaleTimeString()}`
        });
      }
    }
  });
  
  return potentialLeaks;
};

/**
 * Register a disposable resource for cleanup
 * @param {Object} resource - Resource with dispose method
 * @returns {boolean} Success status
 */
export const registerDisposable = (resource) => {
  if (resource && typeof resource.dispose === 'function') {
    disposables.add(resource);
    return true;
  }
  return false;
};

/**
 * Dispose all registered disposable resources
 */
export const disposeAll = () => {
  disposables.forEach(resource => {
    try {
      resource.dispose();
    } catch (error) {
      console.error('Error disposing resource:', error);
    }
  });
  disposables.clear();
};

/**
 * Store a large object with a weak reference to allow GC
 * @param {string} key - Object key
 * @param {any} value - Object value
 */
export const storeWeakly = (key, value) => {
  if (!value) return;
  
  // Create a temporary object to hold the value
  const container = { value };
  weakCache.set(container, { key, timestamp: Date.now() });
  
  return container;
};

/**
 * Clear memory history
 */
export const clearMemoryHistory = () => {
  memoryHistory = [];
  componentMemory.clear();
};

/**
 * React hook to optimize memory usage in components
 * @param {string} componentName - Component name for tracking
 * @returns {Object} Memory management utilities
 */
export const useMemoryOptimizer = (componentName) => {
  const isMounted = useRef(true);
  
  useEffect(() => {
    // Track component mount
    trackMemory(componentName, 'mount');
    
    return () => {
      isMounted.current = false;
      // Track component unmount
      trackMemory(componentName, 'unmount');
    };
  }, [componentName]);
  
  // Debounced function for tracking updates
  const debouncedTrack = useDebounce(() => {
    if (isMounted.current) {
      trackMemory(componentName, 'update');
    }
  }, 1000);
  
  return {
    trackUpdate: debouncedTrack,
    isMounted
  };
};

/**
 * Debounce hook for reducing memory tracking overhead
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const useDebounce = (callback, delay) => {
  const timerRef = useRef(null);
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  return (...args) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    timerRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };
};

/**
 * Apply global memory optimizations
 */
export const applyGlobalOptimizations = () => {
  if (typeof window === 'undefined') return;
  
  // Set up interval to check for memory usage
  const memoryCheckInterval = setInterval(() => {
    const memory = getMemoryUsage();
    if (memory && memory.usagePercentage > 80) {
      console.warn(`[Memory Warning] High memory usage: ${memory.usedJSHeapSize} (${memory.usagePercentage}%)`);
      
      // Try to free memory
      if (window.gc) {
        try {
          window.gc();
        } catch (e) {
          console.error('Failed to perform garbage collection:', e);
        }
      }
    }
  }, 30000); // Check every 30 seconds
  
  // Clear interval when page unloads
  window.addEventListener('beforeunload', () => {
    clearInterval(memoryCheckInterval);
    disposeAll();
  });
  
  // Patch fetch to detect memory leaks from unresolved promises
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const result = originalFetch.apply(this, args);
    
    // Add to tracking
    const activeRequests = window.activeRequests || new Set();
    window.activeRequests = activeRequests;
    
    activeRequests.add(result);
    
    // Remove when done
    result.finally(() => {
      activeRequests.delete(result);
    });
    
    return result;
  };
};

// Apply optimizations automatically
if (typeof window !== 'undefined') {
  setTimeout(applyGlobalOptimizations, 0);
} 
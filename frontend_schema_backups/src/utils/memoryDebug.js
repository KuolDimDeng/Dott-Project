/**
 * Memory debugging utility to help identify memory leaks and usage spikes
 */

// Format memory size to human-readable format
const formatMemory = (bytes) => {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  else return (bytes / 1048576).toFixed(2) + ' MB';
};

// Get current memory usage if available
export const getMemoryUsage = () => {
  if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
    const memory = window.performance.memory;
    return {
      totalJSHeapSize: formatMemory(memory.totalJSHeapSize),
      usedJSHeapSize: formatMemory(memory.usedJSHeapSize),
      jsHeapSizeLimit: formatMemory(memory.jsHeapSizeLimit),
      percentUsed: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2) + '%'
    };
  }
  
  return null;
};

// Log memory usage with component name
export const logMemoryUsage = (componentName, action = 'update') => {
  const memoryInfo = getMemoryUsage();
  
  if (memoryInfo) {
    console.log(`[Memory] ${componentName} ${action}:`, memoryInfo);
  }
};

// Track memory over time
let memoryTracker = [];
const MAX_MEMORY_SAMPLES = 50; // Reduced from 100 to lower memory overhead

// Track components that should be monitored less frequently
const LOW_PRIORITY_ACTIONS = [
  'before-sessionCheck',
  'before-fetchAuthSession',
  'after-fetchAuthSession',
  'before-getCurrentUser',
  'after-getCurrentUser',
  'before-fetchUserAttributes',
  'after-fetchUserAttributes',
  'after-sessionCheck',
  'context-value-creation'
];

export const trackMemory = (componentName, action = 'update') => {
  // Skip tracking for low priority actions to reduce overhead
  if (LOW_PRIORITY_ACTIONS.includes(action)) {
    return;
  }
  
  const memoryInfo = getMemoryUsage();
  
  if (memoryInfo) {
    const timestamp = new Date().toISOString();
    
    // Create a more lightweight entry with only essential information
    const entry = {
      timestamp,
      component: componentName,
      action,
      usedJSHeapSize: memoryInfo.usedJSHeapSize,
      percentUsed: memoryInfo.percentUsed
    };
    
    // Only add to tracker if it's a significant action or high memory usage
    const shouldTrack =
      action === 'state-change' ||
      action === 'interval' ||
      action === 'mount' ||
      action === 'unmount' ||
      parseFloat(memoryInfo.percentUsed) > 70;
      
    if (shouldTrack) {
      memoryTracker.push(entry);
      
      // Keep only the last MAX_MEMORY_SAMPLES entries
      if (memoryTracker.length > MAX_MEMORY_SAMPLES) {
        memoryTracker = memoryTracker.slice(-MAX_MEMORY_SAMPLES);
      }
    }
    
    // Log if memory usage is high (over 80%)
    if (parseFloat(memoryInfo.percentUsed) > 80) {
      console.warn(`[Memory Warning] High memory usage in ${componentName} (${action}):`, memoryInfo);
    }
  }
};

// Get memory tracking data
export const getMemoryTracking = () => {
  return memoryTracker;
};

// Clear memory tracking data
export const clearMemoryTracking = () => {
  memoryTracker = [];
};

// Export a function to detect memory spikes
export const detectMemorySpike = (threshold = 10) => {
  if (memoryTracker.length < 2) return null;
  
  const current = memoryTracker[memoryTracker.length - 1];
  const previous = memoryTracker[memoryTracker.length - 2];
  
  if (!current || !previous) return null;
  
  const currentUsed = parseFloat(current.usedJSHeapSize);
  const previousUsed = parseFloat(previous.usedJSHeapSize);
  
  if (isNaN(currentUsed) || isNaN(previousUsed)) return null;
  
  const percentIncrease = ((currentUsed - previousUsed) / previousUsed) * 100;
  
  if (percentIncrease > threshold) {
    return {
      from: previous,
      to: current,
      percentIncrease: percentIncrease.toFixed(2) + '%',
      absoluteIncrease: formatMemory(currentUsed - previousUsed)
    };
  }
  
  return null;
};
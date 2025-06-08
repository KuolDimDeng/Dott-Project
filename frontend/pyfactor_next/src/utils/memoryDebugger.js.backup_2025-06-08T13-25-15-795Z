/**
 * Memory Debugging Utility
 * 
 * This file provides utilities for debugging memory usage in the application.
 * It can be used to track memory leaks and identify components that consume excessive memory.
 */

// Format memory size to human-readable format
const formatMemory = (bytes) => {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  else return (bytes / 1048576).toFixed(2) + ' MB';
};

// Get current memory usage
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

// Log memory usage
export const logMemoryUsage = (componentName, action = 'update') => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const memoryInfo = getMemoryUsage();
  if (memoryInfo) {
    console.log(`[Memory] ${componentName} ${action}:`, memoryInfo);
  }
};

// Memory tracking history
let memoryHistory = [];
const MAX_HISTORY_SIZE = 100;

// Track memory usage over time
export const trackMemory = (componentName, action = 'update') => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const memoryInfo = getMemoryUsage();
  if (memoryInfo) {
    const entry = {
      timestamp: new Date().toISOString(),
      component: componentName,
      action,
      ...memoryInfo
    };
    
    memoryHistory.push(entry);
    
    // Keep history size manageable
    if (memoryHistory.length > MAX_HISTORY_SIZE) {
      memoryHistory = memoryHistory.slice(-MAX_HISTORY_SIZE);
    }
    
    // Log warning if memory usage is high
    const percentUsed = parseFloat(memoryInfo.percentUsed);
    if (percentUsed > 80) {
      console.warn(`[Memory Warning] High memory usage in ${componentName} (${action}):`, memoryInfo);
    }
  }
};

// Get memory history
export const getMemoryHistory = () => {
  return [...memoryHistory];
};

// Clear memory history
export const clearMemoryHistory = () => {
  memoryHistory = [];
  console.log('[Memory] History cleared');
};

// Detect memory leaks by comparing memory usage over time
export const detectMemoryLeaks = () => {
  if (memoryHistory.length < 10) {
    console.log('[Memory] Not enough history to detect leaks. Need at least 10 entries.');
    return [];
  }
  
  const componentGroups = {};
  
  // Group by component
  memoryHistory.forEach(entry => {
    if (!componentGroups[entry.component]) {
      componentGroups[entry.component] = [];
    }
    componentGroups[entry.component].push(entry);
  });
  
  const potentialLeaks = [];
  
  // Analyze each component's memory usage
  Object.entries(componentGroups).forEach(([component, entries]) => {
    if (entries.length < 5) return; // Need at least 5 entries to analyze
    
    // Sort by timestamp
    entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const firstEntry = entries[0];
    const lastEntry = entries[entries.length - 1];
    
    // Extract numeric values from memory strings
    const firstMemory = parseFloat(firstEntry.usedJSHeapSize);
    const lastMemory = parseFloat(lastEntry.usedJSHeapSize);
    
    if (!isNaN(firstMemory) && !isNaN(lastMemory) && lastMemory > firstMemory) {
      const increase = ((lastMemory - firstMemory) / firstMemory) * 100;
      
      if (increase > 20) { // 20% increase threshold
        potentialLeaks.push({
          component,
          increase: increase.toFixed(2) + '%',
          firstMemory: firstEntry.usedJSHeapSize,
          lastMemory: lastEntry.usedJSHeapSize,
          firstTimestamp: firstEntry.timestamp,
          lastTimestamp: lastEntry.timestamp
        });
      }
    }
  });
  
  return potentialLeaks;
};

// Create a React component for memory debugging
export const createMemoryDebugButton = () => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  // This function returns JSX, but we're defining it as a string
  // so it can be copied and pasted into components
  return `
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      zIndex: 9999,
      backgroundColor: '#f0f0f0',
      padding: '5px',
      borderRadius: '5px',
      border: '1px solid #ccc'
    }}>
      <button onClick={() => {
        const memoryInfo = getMemoryUsage();
        console.log('[Memory Debug] Current memory usage:', memoryInfo);
        
        const leaks = detectMemoryLeaks();
        if (leaks.length > 0) {
          console.warn('[Memory Debug] Potential memory leaks detected:', leaks);
        } else {
          console.log('[Memory Debug] No memory leaks detected');
        }
      }}>
        Debug Memory
      </button>
      <button onClick={clearMemoryHistory} style={{ marginLeft: '5px' }}>
        Clear History
      </button>
    </div>
  `;
};

// Start memory monitoring
export const startMemoryMonitoring = (interval = 10000) => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  console.log('[Memory] Starting memory monitoring');
  logMemoryUsage('Global', 'start');
  
  const intervalId = setInterval(() => {
    trackMemory('Global', 'interval');
    
    // Check for memory leaks periodically
    const leaks = detectMemoryLeaks();
    if (leaks.length > 0) {
      console.warn('[Memory] Potential memory leaks detected:', leaks);
    }
  }, interval);
  
  return intervalId;
};

// Stop memory monitoring
export const stopMemoryMonitoring = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('[Memory] Stopped memory monitoring');
  }
};
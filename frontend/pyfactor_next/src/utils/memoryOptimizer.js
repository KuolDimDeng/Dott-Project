/**
 * Memory Optimizer Utility
 * 
 * This utility provides aggressive memory optimization techniques for Next.js applications.
 * It implements memory management strategies to prevent memory leaks and reduce overall memory usage.
 */

// Store weak references to large objects to allow garbage collection
const weakCache = new WeakMap();

// Track component render counts to identify potential issues
const renderCounts = new Map();

// Maximum number of renders before warning
const MAX_RENDERS = 50;

// Store disposable resources that need cleanup
const disposables = new Set();

/**
 * Register a disposable resource for cleanup
 * @param {Object} resource - Resource with dispose method
 */
export const registerDisposable = (resource) => {
  if (resource && typeof resource.dispose === 'function') {
    disposables.add(resource);
    return true;
  }
  return false;
};

/**
 * Dispose all registered resources
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
 * Store a value in the weak cache to allow garbage collection
 * @param {string} key - Cache key
 * @param {any} value - Value to store
 */
export const storeWeakly = (key, value) => {
  const keyObj = { key };
  weakCache.set(keyObj, value);
  return keyObj;
};

/**
 * Retrieve a value from the weak cache
 * @param {Object} keyObj - Key object returned from storeWeakly
 * @returns {any} Cached value or undefined if collected
 */
export const retrieveWeakly = (keyObj) => {
  return weakCache.get(keyObj);
};

/**
 * Track component render to identify excessive re-renders
 * @param {string} componentName - Name of the component
 */
export const trackRender = (componentName) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const count = renderCounts.get(componentName) || 0;
  renderCounts.set(componentName, count + 1);
  
  if (count + 1 === MAX_RENDERS) {
    console.warn(`[Memory] Component ${componentName} has rendered ${MAX_RENDERS} times, possible memory leak`);
  }
};

/**
 * Reset render count for a component (call on unmount)
 * @param {string} componentName - Name of the component
 */
export const resetRenderCount = (componentName) => {
  renderCounts.delete(componentName);
};

/**
 * Create a memory-optimized version of useState that prevents unnecessary re-renders
 * @param {Function} React - React instance
 * @returns {Function} Optimized useState hook
 */
export const createOptimizedState = (React) => {
  const { useState, useRef, useCallback } = React;
  
  return function useOptimizedState(initialValue) {
    const [state, setState] = useState(initialValue);
    const stateRef = useRef(state);
    
    const optimizedSetState = useCallback((newValue) => {
      // Only update state if value has changed
      if (typeof newValue === 'function') {
        setState(prevState => {
          const nextState = newValue(prevState);
          if (JSON.stringify(nextState) !== JSON.stringify(prevState)) {
            stateRef.current = nextState;
            return nextState;
          }
          return prevState;
        });
      } else if (JSON.stringify(newValue) !== JSON.stringify(state)) {
        stateRef.current = newValue;
        setState(newValue);
      }
    }, [state]);
    
    return [state, optimizedSetState];
  };
};

/**
 * Force garbage collection by creating memory pressure
 * Note: This is a last resort and should be used carefully
 */
export const forceGarbageCollection = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[Memory] Attempting to force garbage collection');
  }
  
  // Create temporary memory pressure to encourage garbage collection
  const memoryPressure = [];
  try {
    // Create large arrays to force memory pressure
    for (let i = 0; i < 10; i++) {
      memoryPressure.push(new Array(1000000).fill(0));
    }
  } catch (e) {
    // Ignore allocation errors
  }
  
  // Clear the arrays
  memoryPressure.length = 0;
};

/**
 * Optimize a React component to reduce memory usage
 * @param {Function} Component - React component to optimize
 * @param {Object} options - Optimization options
 * @returns {Function} Optimized component
 */
export const optimizeComponent = (Component, options = {}) => {
  const {
    name = Component.displayName || Component.name || 'UnknownComponent',
    memoize = true,
    trackRenders = true,
    disposeOnUnmount = true
  } = options;
  
  // Create optimized component
  const OptimizedComponent = (props) => {
    // Track render if enabled
    if (trackRenders) {
      trackRender(name);
    }
    
    // Add cleanup on unmount
    React.useEffect(() => {
      return () => {
        if (trackRenders) {
          resetRenderCount(name);
        }
        
        if (disposeOnUnmount) {
          disposeAll();
        }
        
        // Encourage garbage collection
        setTimeout(forceGarbageCollection, 0);
      };
    }, []);
    
    return React.createElement(Component, props);
  };
  
  OptimizedComponent.displayName = `Optimized(${name})`;
  
  // Memoize if enabled
  return memoize ? React.memo(OptimizedComponent) : OptimizedComponent;
};

/**
 * Create a memory-efficient event handler
 * @param {Function} handler - Event handler function
 * @returns {Function} Memory-efficient event handler
 */
export const createStableHandler = (handler) => {
  // Use a stable reference that can be updated
  const handlerRef = { current: handler };
  
  // Return a stable function that uses the current handler
  return (...args) => handlerRef.current(...args);
};

/**
 * Optimize images to reduce memory usage
 * @param {string} src - Image source URL
 * @param {Object} options - Optimization options
 * @returns {Object} Optimized image props
 */
export const optimizeImage = (src, options = {}) => {
  const {
    width,
    height,
    quality = 75,
    priority = false,
    loading = 'lazy',
    decoding = 'async'
  } = options;
  
  return {
    src,
    width,
    height,
    quality,
    priority,
    loading,
    decoding,
    // Add fetchPriority for modern browsers
    fetchPriority: priority ? 'high' : 'auto',
    // Add native lazy loading
    loading: priority ? 'eager' : 'lazy'
  };
};

/**
 * Create a memory-efficient context provider
 * @param {Object} Context - React context
 * @param {Function} useValue - Hook that returns the context value
 * @returns {Function} Memory-efficient context provider
 */
export const createEfficientProvider = (Context, useValue) => {
  return function EfficientProvider({ children }) {
    // Get value from hook
    const value = useValue();
    
    // Memoize value to prevent unnecessary re-renders
    const memoizedValue = React.useMemo(() => value, [
      // Convert value to JSON to compare by value
      JSON.stringify(value)
    ]);
    
    return React.createElement(
      Context.Provider,
      { value: memoizedValue },
      children
    );
  };
};

/**
 * Apply memory optimizations to the Next.js app
 * @param {Object} options - Optimization options
 */
export const applyGlobalOptimizations = (options = {}) => {
  const {
    disableConsoleInProduction = true,
    limitEventListeners = true,
    optimizeNetworkRequests = true
  } = options;
  
  // Disable console in production to save memory
  if (disableConsoleInProduction && process.env.NODE_ENV === 'production') {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    // Keep error and warn for debugging
  }
  
  // Limit event listeners to prevent memory leaks
  if (limitEventListeners && typeof window !== 'undefined') {
    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;
    const listeners = new Map();
    
    window.addEventListener = function(type, listener, options) {
      const key = type + (listener.toString().slice(0, 100));
      listeners.set(key, { type, listener, options });
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    window.removeEventListener = function(type, listener, options) {
      const key = type + (listener.toString().slice(0, 100));
      listeners.delete(key);
      return originalRemoveEventListener.call(this, type, listener, options);
    };
    
    // Periodically check for potential memory leaks
    setInterval(() => {
      if (listeners.size > 100) {
        console.warn(`[Memory] High number of event listeners: ${listeners.size}`);
      }
    }, 30000);
  }
  
  // Optimize network requests to reduce memory usage
  if (optimizeNetworkRequests && typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      const controller = new AbortController();
      const { signal } = controller;
      
      // Add signal to request if not already present
      if (args[1] && !args[1].signal) {
        args[1] = { ...args[1], signal };
      } else if (!args[1]) {
        args[1] = { signal };
      }
      
      // Set timeout to abort long-running requests
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000);
      
      const promise = originalFetch.apply(this, args);
      
      // Clean up timeout on completion
      promise.finally(() => {
        clearTimeout(timeoutId);
      });
      
      return promise;
    };
  }
};

/**
 * Create a memory-efficient data fetcher
 * @param {Function} fetchFn - Function that performs the fetch
 * @returns {Function} Memory-efficient data fetcher
 */
export const createEfficientFetcher = (fetchFn) => {
  // Cache for responses
  const cache = new Map();
  // LRU tracking - keep track of most recently used keys
  const lruKeys = [];
  // Maximum cache size - adjust depending on expected data size
  const MAX_CACHE_SIZE = 50;
  
  // Helper function to create cache keys safely (avoiding circular references)
  const createCacheKey = (args) => {
    try {
      // Create a simplified version of args to avoid circular references
      const simplifiedArgs = args.map(arg => {
        if (arg === null || arg === undefined) return arg;
        
        // For objects, only use primitive properties to avoid circular refs
        if (typeof arg === 'object') {
          const simpleObj = {};
          // Only include primitive values in the key
          Object.keys(arg).forEach(key => {
            const val = arg[key];
            if (val === null || 
                val === undefined || 
                typeof val === 'string' || 
                typeof val === 'number' || 
                typeof val === 'boolean') {
              simpleObj[key] = val;
            }
          });
          return simpleObj;
        }
        
        return arg;
      });
      
      return JSON.stringify(simplifiedArgs);
    } catch (error) {
      // Fallback if JSON stringify fails (e.g., circular references)
      console.warn('Cache key creation failed, using fallback:', error.message);
      
      // Create a unique key based on argument types and some values
      return args.map(arg => {
        const type = typeof arg;
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (type === 'string' || type === 'number' || type === 'boolean') return String(arg);
        if (type === 'object') {
          if (Array.isArray(arg)) return `array:${arg.length}`;
          return `object:${Object.keys(arg).join(',')}`;
        }
        return type;
      }).join('|');
    }
  };
  
  // Update LRU order
  const updateLRU = (key) => {
    // Remove the key if it already exists
    const index = lruKeys.indexOf(key);
    if (index !== -1) {
      lruKeys.splice(index, 1);
    }
    // Add key to the front (most recently used)
    lruKeys.unshift(key);
  };
  
  // Cleanup cache if it's too large
  const cleanupCache = () => {
    while (cache.size > MAX_CACHE_SIZE) {
      // Remove least recently used item
      const oldestKey = lruKeys.pop();
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }
  };
  
  return async function efficientFetch(...args) {
    // Create a safe cache key
    const key = createCacheKey(args);
    
    // Return cached response if available
    if (cache.has(key)) {
      // Update LRU tracking
      updateLRU(key);
      return cache.get(key);
    }
    
    try {
      // Perform fetch
      const response = await fetchFn(...args);
      
      // Cache successful response
      cache.set(key, response);
      updateLRU(key);
      
      // Clean up old cache entries if needed
      cleanupCache();
      
      return response;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  };
};

/**
 * Optimize a React component tree by applying optimizations to all components
 * @param {Object} components - Object containing React components
 * @returns {Object} Optimized components
 */
export const optimizeComponentTree = (components) => {
  const optimized = {};
  
  Object.entries(components).forEach(([name, component]) => {
    optimized[name] = optimizeComponent(component, { name });
  });
  
  return optimized;
};

// Export a function to monitor memory usage
export const monitorMemoryUsage = (interval = 10000) => {
  if (typeof window === 'undefined' || !window.performance || !window.performance.memory) {
    return null;
  }
  
  const intervalId = setInterval(() => {
    const { 
      totalJSHeapSize, 
      usedJSHeapSize, 
      jsHeapSizeLimit 
    } = window.performance.memory;
    
    const percentUsed = (usedJSHeapSize / jsHeapSizeLimit) * 100;
    
    if (percentUsed > 80) {
      console.warn('[Memory] Critical memory usage:', {
        used: Math.round(usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(jsHeapSizeLimit / 1048576) + ' MB',
        percent: percentUsed.toFixed(2) + '%'
      });
      
      // Force garbage collection on high memory usage
      forceGarbageCollection();
    }
  }, interval);
  
  return intervalId;
};

// Export a function to stop memory monitoring
export const stopMemoryMonitoring = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
  }
};
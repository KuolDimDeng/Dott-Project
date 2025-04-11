/**
 * Memory Saving Utilities
 * 
 * A collection of reusable patterns and components to reduce memory usage
 * in React applications.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useMemoryOptimizer } from './memoryManager';

/**
 * Memoizes a component to prevent unnecessary re-renders
 * @param {React.ComponentType} Component - Component to memoize
 * @param {string} displayName - Optional display name for debugging
 */
export function memoizeComponent(Component, displayName = '') {
  const MemoizedComponent = React.memo(Component);
  if (displayName) {
    MemoizedComponent.displayName = `Memoized(${displayName || Component.name || 'Component'})`;
  }
  return MemoizedComponent;
}

/**
 * Creates a stable callback that won't change on re-renders
 * @param {Function} callback - The callback function
 * @param {Array} dependencies - Dependency array
 */
export function stableCallback(callback, dependencies = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, dependencies);
}

/**
 * Creates a stable reference to a value
 * @param {any} value - The value to create a stable reference to
 */
export function stableRef(value) {
  const ref = useRef(value);
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref;
}

/**
 * Creates an array once and maintains the same reference
 * @param {Array} initialArray - Initial array value
 */
export function stableArray(initialArray = []) {
  return useMemo(() => initialArray, []);
}

/**
 * Creates an object once and maintains the same reference
 * @param {Object} initialObject - Initial object value
 */
export function stableObject(initialObject = {}) {
  return useMemo(() => initialObject, []);
}

/**
 * Safely use map operation with null/undefined protection
 * @param {Array} array - The array to map over
 * @param {Function} mapFn - The mapping function
 * @param {Array} defaultValue - Default value if array is null/undefined
 */
export function safeMap(array, mapFn, defaultValue = []) {
  return array && Array.isArray(array) && array.length > 0
    ? array.map(mapFn)
    : defaultValue;
}

/**
 * Optimized version of useState for arrays to prevent excessive re-renders
 * @param {Array} initialValue - Initial array value
 */
export function useArrayState(initialValue = []) {
  const [array, setArray] = useState(() => initialValue);
  
  const actions = useMemo(() => ({
    set: (newArray) => setArray(newArray),
    push: (item) => setArray(prev => [...prev, item]),
    update: (index, newItem) => {
      setArray(prev => {
        const newArray = [...prev];
        newArray[index] = newItem;
        return newArray;
      });
    },
    remove: (index) => {
      setArray(prev => {
        const newArray = [...prev];
        newArray.splice(index, 1);
        return newArray;
      });
    },
    filter: (filterFn) => {
      setArray(prev => prev.filter(filterFn));
    },
    clear: () => setArray([])
  }), []);
  
  return [array, actions];
}

/**
 * Optimized version of useState for objects to prevent excessive re-renders
 * @param {Object} initialValue - Initial object value
 */
export function useObjectState(initialValue = {}) {
  const [obj, setObj] = useState(() => initialValue);
  
  const actions = useMemo(() => ({
    set: (newObj) => setObj(newObj),
    update: (updates) => {
      setObj(prev => ({
        ...prev,
        ...updates
      }));
    },
    setProperty: (key, value) => {
      setObj(prev => ({
        ...prev,
        [key]: value
      }));
    },
    removeProperty: (key) => {
      setObj(prev => {
        const newObj = { ...prev };
        delete newObj[key];
        return newObj;
      });
    },
    clear: () => setObj({})
  }), []);
  
  return [obj, actions];
}

/**
 * Wrapper to safely handle multiple state updates in a single render cycle
 * @param {Object} initialState - Initial state object
 */
export function useBatchedState(initialState = {}) {
  const [state, setState] = useState(() => initialState);
  const pendingUpdates = useRef({});
  const updateScheduled = useRef(false);
  
  const scheduleUpdate = useCallback(() => {
    if (!updateScheduled.current) {
      updateScheduled.current = true;
      
      // Use Promise.resolve to batch in the next microtask
      Promise.resolve().then(() => {
        if (Object.keys(pendingUpdates.current).length > 0) {
          setState(prev => ({
            ...prev,
            ...pendingUpdates.current
          }));
          pendingUpdates.current = {};
        }
        updateScheduled.current = false;
      });
    }
  }, []);
  
  const batchedSetState = useCallback((updates) => {
    // Store updates to be applied at once
    Object.assign(pendingUpdates.current, updates);
    scheduleUpdate();
  }, [scheduleUpdate]);
  
  const setStateProperty = useCallback((key, value) => {
    pendingUpdates.current[key] = value;
    scheduleUpdate();
  }, [scheduleUpdate]);
  
  return [state, batchedSetState, setStateProperty];
}

/**
 * Optimized wrapper for fetching data
 * @param {Function} fetchFn - Function that returns a promise with data
 * @param {Array} dependencies - Array of dependencies
 * @param {Object} options - Options for the fetch
 */
export function useSafeFetch(fetchFn, dependencies = [], options = {}) {
  const { 
    initialData = null, 
    onSuccess = null, 
    onError = null,
    skip = false,
    retry = 0 
  } = options;
  
  const [data, setData] = useState(() => initialData);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const retryCount = useRef(0);
  const isMounted = useRef(true);
  
  // Memory optimization
  const { trackUpdate } = useMemoryOptimizer('useSafeFetch');
  
  // Stable callback references
  const stableOnSuccess = useRef(onSuccess);
  const stableOnError = useRef(onError);
  useEffect(() => {
    stableOnSuccess.current = onSuccess;
    stableOnError.current = onError;
  }, [onSuccess, onError]);
  
  useEffect(() => {
    isMounted.current = true;
    retryCount.current = 0;
    
    if (skip) {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await fetchFn();
        
        // Prevent state updates if component unmounted
        if (isMounted.current) {
          setData(result);
          setLoading(false);
          
          // Only track successful updates
          trackUpdate();
          
          if (stableOnSuccess.current) {
            stableOnSuccess.current(result);
          }
        }
      } catch (error) {
        console.error('Error in useSafeFetch:', error);
        
        if (isMounted.current) {
          setError(error);
          setLoading(false);
          
          if (stableOnError.current) {
            stableOnError.current(error);
          }
          
          // Retry logic
          if (retry > 0 && retryCount.current < retry) {
            retryCount.current += 1;
            const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
            
            setTimeout(() => {
              if (isMounted.current) {
                fetchData();
              }
            }, delay);
          }
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  
  return { data, loading, error, retry: () => {
    retryCount.current = 0;
    setLoading(true);
    setError(null);
    fetchFn().then(result => {
      if (isMounted.current) {
        setData(result);
        setLoading(false);
        if (stableOnSuccess.current) {
          stableOnSuccess.current(result);
        }
      }
    }).catch(error => {
      if (isMounted.current) {
        setError(error);
        setLoading(false);
        if (stableOnError.current) {
          stableOnError.current(error);
        }
      }
    });
  }};
}

/**
 * Lazy load component with proper cleanup
 * @param {Function} importFn - Function that imports the component
 * @param {React.ComponentType} Fallback - Component to show while loading
 */
export function LazyWithCleanup(importFn, Fallback = () => null) {
  const LazyComponent = React.lazy(importFn);
  
  return function LazyWrapper(props) {
    return (
      <React.Suspense fallback={<Fallback />}>
        <ErrorBoundary>
          <LazyComponent {...props} />
        </ErrorBoundary>
      </React.Suspense>
    );
  };
}

/**
 * Simple error boundary to prevent component crashes
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Component error caught by ErrorBoundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <p>Something went wrong.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

/**
 * Wrapper to make any component memory-efficient
 * @param {React.ComponentType} Component - Component to optimize
 */
export function withMemoryOptimization(Component) {
  function OptimizedComponent(props) {
    const { trackUpdate } = useMemoryOptimizer(Component.name || 'UnknownComponent');
    
    // Track memory on important lifecycle events
    useEffect(() => {
      return () => {
        // Clean up will happen automatically in the hook
      };
    }, []);
    
    // Force update tracking when props change
    useEffect(() => {
      trackUpdate();
    }, [Object.values(props), trackUpdate]);
    
    return <Component {...props} />;
  }
  
  OptimizedComponent.displayName = `Optimized(${Component.displayName || Component.name || 'Component'})`;
  
  return React.memo(OptimizedComponent);
}

export { ErrorBoundary }; 
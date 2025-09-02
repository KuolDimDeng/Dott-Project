/**
 * Performance Optimization Utilities
 * Provides tools to optimize React component re-renders
 */

import React, { memo, useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * Deep comparison function for React.memo
 * More thorough than default shallow comparison
 */
export function deepMemoCompare(prevProps, nextProps) {
  // First check if the number of keys is different
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  
  if (prevKeys.length !== nextKeys.length) {
    return false;
  }
  
  // Then check each key
  for (const key of prevKeys) {
    const prevValue = prevProps[key];
    const nextValue = nextProps[key];
    
    // Handle functions specially - they should be memoized
    if (typeof prevValue === 'function' && typeof nextValue === 'function') {
      if (prevValue !== nextValue) {
        console.warn(`[Performance] Function prop "${key}" changed. Consider using useCallback.`);
        return false;
      }
      continue;
    }
    
    // Deep comparison for objects
    if (prevValue !== nextValue) {
      if (typeof prevValue === 'object' && prevValue !== null && 
          typeof nextValue === 'object' && nextValue !== null) {
        if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
          return false;
        }
      } else {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * HOC to add performance monitoring to components
 */
export function withPerformanceMonitoring(Component, componentName) {
  const MemoizedComponent = memo((props) => {
    const renderCount = useRef(0);
    const renderTimeRef = useRef(Date.now());
    
    useEffect(() => {
      renderCount.current += 1;
      const renderTime = Date.now() - renderTimeRef.current;
      
      if (renderTime > 16) { // More than one frame (16ms)
        console.warn(`[Performance] ${componentName} slow render: ${renderTime}ms`);
      }
      
      if (renderCount.current > 10 && renderCount.current % 10 === 0) {
        console.warn(`[Performance] ${componentName} rendered ${renderCount.current} times`);
      }
      
      renderTimeRef.current = Date.now();
    });
    
    return <Component {...props} />;
  }, deepMemoCompare);
  
  // Add display name for better debugging
  MemoizedComponent.displayName = `withPerformanceMonitoring(${componentName || Component.displayName || Component.name || 'Component'})`;
  
  return MemoizedComponent;
}

/**
 * Hook to debounce values
 * Prevents unnecessary re-renders from rapid value changes
 */
export function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Hook to track why a component re-rendered
 * Useful for debugging performance issues
 */
export function useWhyDidYouUpdate(name, props) {
  const previousProps = useRef();
  
  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps = {};
      
      allKeys.forEach((key) => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key]
          };
        }
      });
      
      if (Object.keys(changedProps).length) {
        console.log('[Performance] Why did', name, 'update:', changedProps);
      }
    }
    
    previousProps.current = props;
  });
}

/**
 * Optimized context provider that prevents unnecessary re-renders
 */
export function createOptimizedContext(name) {
  const Context = React.createContext();
  
  function Provider({ children, value }) {
    // Memoize the context value to prevent re-renders
    const memoizedValue = useMemo(() => value, [JSON.stringify(value)]);
    
    return (
      <Context.Provider value={memoizedValue}>
        {children}
      </Context.Provider>
    );
  }
  
  function useContext() {
    const context = React.useContext(Context);
    if (!context) {
      throw new Error(`use${name} must be used within ${name}Provider`);
    }
    return context;
  }
  
  return { Provider, useContext };
}

/**
 * Hook for lazy loading components with loading state
 */
export function useLazyComponent(importFunc, fallback = null) {
  const [Component, setComponent] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  useEffect(() => {
    let mounted = true;
    
    importFunc()
      .then((module) => {
        if (mounted) {
          setComponent(() => module.default || module);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });
    
    return () => {
      mounted = false;
    };
  }, []);
  
  return { Component, loading, error };
}

/**
 * Memoized selector hook for extracting data from objects
 * Prevents re-renders when unrelated parts of the object change
 */
export function useSelector(object, selector) {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  
  return useMemo(() => {
    if (!object) return null;
    return selectorRef.current(object);
  }, [object]);
}

/**
 * Batch state updates to reduce re-renders
 */
export function useBatchedState(initialState) {
  const [state, setState] = React.useState(initialState);
  const pendingUpdates = useRef({});
  const timeoutRef = useRef(null);
  
  const batchUpdate = useCallback((updates) => {
    Object.assign(pendingUpdates.current, updates);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, ...pendingUpdates.current }));
      pendingUpdates.current = {};
      timeoutRef.current = null;
    }, 0);
  }, []);
  
  return [state, batchUpdate];
}
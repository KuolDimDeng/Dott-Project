'use client';


import React, { createContext, useContext, forwardRef } from 'react';

/**
 * A simple wrapper component to provide consistent styling
 */
export function SafeWrapper({ children }) {
  return <div className="safe-context-wrapper">{children}</div>;
}

/**
 * A utility HOC (Higher Order Component) to wrap components
 */
export function withSafeContext(Component) {
  const SafeComponent = forwardRef((props, ref) => {
    return (
      <SafeWrapper>
        <Component {...props} ref={ref} />
      </SafeWrapper>
    );
  });
  
  // Copy display name for better debugging
  SafeComponent.displayName = `withSafeContext(${Component.displayName || Component.name || 'Component'})`;
  
  return SafeComponent;
}

/**
 * A direct pass-through to React's createContext
 * with additional safety measures
 */
export function createSafeContext(defaultValue) {
  const context = createContext(defaultValue);
  
  // Create a safe Consumer that always expects a function child
  const OriginalConsumer = context.Consumer;
  context.Consumer = function SafeConsumer({ children, ...props }) {
    // Ensure children is a function
    if (typeof children !== 'function') {
      console.error('Context.Consumer expects a function as a child');
      return null;
    }
    
    return <OriginalConsumer {...props}>{children}</OriginalConsumer>;
  };
  
  // Create a safe Provider
  const OriginalProvider = context.Provider;
  context.Provider = function SafeProvider({ value, children, ...props }) {
    return <OriginalProvider value={value} {...props}>{children}</OriginalProvider>;
  };
  
  return context;
}

/**
 * A direct pass-through to React's useContext
 * With error handling for better debugging
 */
export function useSafeContext(Context) {
  try {
    return useContext(Context);
  } catch (error) {
    console.error('Error using context:', error);
    // Return default value instead of null to prevent further errors
    return Context._currentValue || {};
  }
}

/**
 * @deprecated Use useContext hook directly instead
 * This function is kept for backward compatibility but should not be used
 */
export function SafeConsumer() {
  console.error('SafeConsumer is deprecated and should not be used. Use the useContext hook instead.');
  return null;
}
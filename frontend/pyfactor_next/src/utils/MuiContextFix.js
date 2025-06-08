'use client';


import React from 'react';
import { SafeWrapper } from './ContextFix';

/**
 * A utility component to safely wrap Tailwind components
 */
export function TailwindSafeWrapper({ children }) {
  return <SafeWrapper>{children}</SafeWrapper>;
}

/**
 * A utility HOC (Higher Order Component) to safely wrap Tailwind components
 */
export function withTailwindSafeContext(Component) {
  function SafeTailwindComponent(props) {
    return (
      <SafeWrapper>
        <Component {...props} />
      </SafeWrapper>
    );
  }
  
  // Copy display name for better debugging
  SafeTailwindComponent.displayName = `withTailwindSafeContext(${Component.displayName || Component.name || 'Component'})`;
  
  return SafeTailwindComponent;
}

/**
 * A utility component to safely wrap context providers
 */
export function SafeContextProvider({ children, ...props }) {
  return (
    <SafeWrapper>
      {React.cloneElement(children, props)}
    </SafeWrapper>
  );
}
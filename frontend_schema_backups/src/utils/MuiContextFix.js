'use client';

import React from 'react';
import { SafeWrapper } from './ContextFix';

/**
 * A utility component to safely wrap MUI components
 */
export function MuiSafeWrapper({ children }) {
  return <SafeWrapper>{children}</SafeWrapper>;
}

/**
 * A utility HOC (Higher Order Component) to safely wrap MUI components
 */
export function withMuiSafeContext(Component) {
  function SafeMuiComponent(props) {
    return (
      <SafeWrapper>
        <Component {...props} />
      </SafeWrapper>
    );
  }
  
  // Copy display name for better debugging
  SafeMuiComponent.displayName = `withMuiSafeContext(${Component.displayName || Component.name || 'Component'})`;
  
  return SafeMuiComponent;
}

/**
 * A utility component to safely wrap ThemeProvider
 */
export function SafeThemeProvider({ children, ...props }) {
  return (
    <SafeWrapper>
      {React.cloneElement(children, props)}
    </SafeWrapper>
  );
}
'use client';

import React, { useState, useEffect } from 'react';

/**
 * A wrapper component that dynamically loads Floating UI
 * and provides it to child components
 */
export default function FloatingUIWrapper({ children, onLoad, fallback = null }) {
  const [floatingUI, setFloatingUI] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadUI() {
      try {
        setIsLoading(true);
        // Dynamically import @floating-ui/react
        const floatingUIModule = await import('@floating-ui/react');
        
        if (isMounted) {
          setFloatingUI(floatingUIModule);
          setIsLoading(false);
          if (onLoad) onLoad(floatingUIModule);
        }
      } catch (err) {
        console.error('Error loading Floating UI:', err);
        if (isMounted) {
          setError(err);
          setIsLoading(false);
        }
      }
    }

    loadUI();

    return () => {
      isMounted = false;
    };
  }, [onLoad]);

  if (isLoading) {
    return fallback || <div>Loading UI components...</div>;
  }

  if (error) {
    console.error('FloatingUIWrapper error:', error);
    return fallback || <div>Error loading UI components</div>;
  }

  // Pass the loaded module to children as a prop
  return children(floatingUI);
}

/**
 * Example usage:
 * 
 * <FloatingUIWrapper>
 *   {(ui) => {
 *     const { useFloating, offset, flip } = ui;
 *     // Use the floating UI hooks and components here
 *     return <YourComponent />;
 *   }}
 * </FloatingUIWrapper>
 */ 
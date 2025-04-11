'use client';

import React, { useEffect, useState } from 'react';
import { SafeWrapper } from '@/utils/ContextFix';
import PropTypes from 'prop-types';

/**
 * ClientOnly component 
 * Ensures children are only rendered on the client to prevent SSR issues with:
 * - useLayoutEffect warnings
 * - Components that depend on browser APIs
 * - Third-party components with client-side-only dependencies
 */
export function ClientOnly({ children, fallback = null, delay = 0 }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Use optional delay to ensure any mounting effects complete first
    if (delay > 0) {
      const timer = setTimeout(() => {
        setHasMounted(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setHasMounted(true);
    }
  }, [delay]);

  // Return fallback during server-side rendering
  if (!hasMounted) {
    return fallback;
  }

  // For function children, call the function to get the content
  if (typeof children === 'function') {
    return <SafeWrapper>{children()}</SafeWrapper>;
  }
  
  // For regular children, just render them
  return <SafeWrapper>{children}</SafeWrapper>;
}

// Define prop types
ClientOnly.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.func
  ]).isRequired,
  fallback: PropTypes.node,
  delay: PropTypes.number
};

// Add named export and default export
export default ClientOnly;

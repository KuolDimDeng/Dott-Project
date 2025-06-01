'use client';

import React, { useEffect, useState } from 'react';
import { SafeWrapper } from '@/utils/ContextFix';
import PropTypes from 'prop-types';

/**
 * ClientOnly component to prevent hydration mismatches
 * This renders content only after client-side hydration is complete
 */
export default function ClientOnly({ children, fallback = null }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

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
  fallback: PropTypes.node
};

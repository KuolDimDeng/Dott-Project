///Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/ClientOnly.js
'use client';

import React, { useEffect, useState } from 'react';
import { SafeWrapper } from '@/utils/ContextFix';
import PropTypes from 'prop-types';

export function ClientOnly({ children }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Set mounted state immediately without setTimeout
    setHasMounted(true);
  }, []);

  // Return null during server-side rendering
  if (!hasMounted) {
    return null;
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
  ]).isRequired
};

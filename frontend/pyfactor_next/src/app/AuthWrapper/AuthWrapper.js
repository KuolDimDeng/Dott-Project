///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/AuthWrapper/AuthWrapper.js
import { useEffect, useState } from 'react';
// No need to import configureAmplify as it's already done in amplifyUnified.js
import LoadingSpinner from '@/components/LoadingSpinner';
import { SafeWrapper } from '@/utils/ContextFix';

export function AuthWrapper({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsInitialized(true);
      return;
    }

    // Auth is already configured in amplifyUnified.js
    setIsInitialized(true);
  }, []);

  // During server-side rendering or after initialization, render children
  if (typeof window === 'undefined' || isInitialized) {
    return <SafeWrapper>{children}</SafeWrapper>;
  }

  // On client-side, wait for initialization
  return <LoadingSpinner />; // Show loading spinner while initializing
}

export default AuthWrapper;

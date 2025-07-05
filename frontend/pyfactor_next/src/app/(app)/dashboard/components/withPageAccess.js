'use client';

/**
 * @file withPageAccess.js
 * @description Higher-order component for page access control
 */

import React, { useEffect, useState } from 'react';
import { hasPageAccess, PAGE_ACCESS } from '@/utils/pageAccess';
import AccessRestricted from './AccessRestricted';
import { usePathname } from 'next/navigation';
import { logger } from '@/utils/logger';

/**
 * Higher-order component that checks if the user has access to a page
 * @param {React.Component} Component - The component to wrap
 * @param {string} requiredPageAccess - The access level required for this page
 * @returns {React.Component} The wrapped component with access control
 */
export default function withPageAccess(Component, requiredPageAccess) {
  return function WithPageAccessComponent(props) {
    const [hasAccess, setHasAccess] = useState(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
      // Check if the user has access to this page
      const checkAccess = () => {
        try {
          const accessGranted = hasPageAccess(requiredPageAccess);
          setHasAccess(accessGranted);
          logger.debug(`[withPageAccess] Access to ${requiredPageAccess} page: ${accessGranted ? 'granted' : 'denied'}`);
        } catch (error) {
          logger.error(`[withPageAccess] Error checking page access: ${error}`);
          setHasAccess(false); // Default to no access on error
        } finally {
          setLoading(false);
        }
      };

      checkAccess();
    }, [pathname]);

    if (loading) {
      // Show a loading state while we check access
      return (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    // If the user has access, render the component
    // Otherwise, show the access restricted message
    return hasAccess ? <Component {...props} /> : <AccessRestricted />;
  };
}

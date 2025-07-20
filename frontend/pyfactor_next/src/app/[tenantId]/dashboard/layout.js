'use client';

import { useParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import Script from 'next/script';
import { useEffect } from 'react';

/**
 * Layout for tenant-specific dashboard route
 */
export default function TenantDashboardLayout({ children }) {
  const params = useParams();
  const tenantId = params?.tenantId;

  // Log tenant ID for debugging
  logger.debug(`[TenantDashboardLayout] Rendering for tenant: ${tenantId}`);

  useEffect(() => {
    // Add global error handler to catch "t is not defined" errors
    const globalErrorHandler = (event) => {
      console.error('🚨 [GlobalErrorHandler] === GLOBAL ERROR CAUGHT ===');
      console.error('Error Message:', event.message);
      console.error('Error Source:', event.filename);
      console.error('Line:', event.lineno);
      console.error('Column:', event.colno);
      console.error('Error Object:', event.error);
      
      // Check if this is the "t is not defined" error
      if (event.message?.includes('t is not defined')) {
        console.error('🎯 FOUND "t is not defined" ERROR IN GLOBAL HANDLER!');
        console.error('Error occurred at:', event.filename, 'line:', event.lineno, 'column:', event.colno);
        
        if (event.error?.stack) {
          console.error('Full stack trace:');
          const stackLines = event.error.stack.split('\n');
          stackLines.forEach((line, index) => {
            console.error(`  ${index}: ${line}`);
          });
        }
        
        // Try to identify the source
        if (event.filename) {
          console.error('Error source file:', event.filename);
          console.error('Checking if it\'s a chunk or component...');
        }
      }
    };

    // Add the error handler
    window.addEventListener('error', globalErrorHandler);

    // Also add unhandled rejection handler
    const unhandledRejectionHandler = (event) => {
      console.error('🚨 [UnhandledRejection] === PROMISE REJECTION ===');
      console.error('Reason:', event.reason);
      
      if (event.reason?.message?.includes('t is not defined')) {
        console.error('🎯 FOUND "t is not defined" ERROR IN PROMISE REJECTION!');
        console.error('Full reason:', event.reason);
        if (event.reason?.stack) {
          console.error('Stack trace:', event.reason.stack);
        }
      }
    };

    window.addEventListener('unhandledrejection', unhandledRejectionHandler);

    // Cleanup
    return () => {
      window.removeEventListener('error', globalErrorHandler);
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    };
  }, []);

  return (
    <div className="h-full min-h-screen bg-gray-50">
      {/* Re-rendering issues fixed directly in components - script removed to prevent MIME type errors */}
      {children}
    </div>
  );
} 
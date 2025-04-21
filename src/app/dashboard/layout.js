// This file is a server component (no 'use client' directive) for metadata
import React from 'react';
import DashboardClientLayout from './DashboardClientLayout';
import MiddlewareHeaderHandler from '@/components/MiddlewareHeaderHandler';
import SessionProviderWrapper from './SessionProviderWrapper';
import Script from 'next/script';

// Export metadata from this server component
export const metadata = {
  title: 'Dashboard | Dott Business Management',
  description: 'Loading your dashboard...',
};

// The layout is now a server component that wraps the client component
export default function DashboardLayout({ children }) {
  return (
    <>
      {/* Add fallback script for handling chunk loading errors */}
      <Script id="chunk-error-handler" strategy="beforeInteractive">
        {`
          // Global error handler for chunk loading errors
          window.addEventListener('error', function(e) {
            if (e && e.message && (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk'))) {
              console.error('Caught chunk load error in global handler, recovering...');
              
              // Attempt to clean the cache by clearing service workers if present
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
              
              // Force a clean reload after a short delay
              setTimeout(() => {
                window.location.href = '/dashboard?refresh=true&ts=' + Date.now();
              }, 500);
            }
          });
        `}
      </Script>
      
      <MiddlewareHeaderHandler />
      <SessionProviderWrapper>
        <DashboardClientLayout>
          {children}
        </DashboardClientLayout>
      </SessionProviderWrapper>
    </>
  );
} 
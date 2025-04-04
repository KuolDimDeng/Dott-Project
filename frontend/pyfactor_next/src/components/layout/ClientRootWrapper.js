'use client';

import { useEffect } from 'react';
import ConfigureAmplify from "@/components/ConfigureAmplify";
import { Providers } from "@/app/providers";
import CircuitBreakerWrapper from "@/app/CircuitBreakerWrapper";
import ClientProviders from "@/app/ClientProviders";
import dynamic from 'next/dynamic';

// Import auth config directly - remove dynamic imports
import '@/config/amplifyConfig';

// Dynamically import development tools (only in dev mode)
const TenantControls = dynamic(
  () => process.env.NODE_ENV === 'development' 
    ? import('@/components/DevTools/TenantControls') 
    : Promise.resolve(() => null),
  { ssr: false }
);

export default function ClientRootWrapper({ children }) {
  // Log when the client wrapper mounts to help with debugging
  useEffect(() => {
    console.log('[ClientRootWrapper] Mounted - this wrapper provides all client-side functionality');
    
    return () => {
      console.log('[ClientRootWrapper] Unmounting');
    };
  }, []);
  
  return (
    <>
      {/* Authentication configuration */}
      <ConfigureAmplify />
      
      {/* Providers and app structure */}
      <Providers>
        <CircuitBreakerWrapper>
          <ClientProviders>
            {/* Main application content */}
            {children}
            
            {/* Development mode tools */}
            {process.env.NODE_ENV === 'development' && <TenantControls />}
          </ClientProviders>
        </CircuitBreakerWrapper>
      </Providers>
    </>
  );
} 
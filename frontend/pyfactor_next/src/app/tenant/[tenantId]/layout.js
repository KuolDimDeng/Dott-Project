import { cookies } from 'next/headers';
import { useTenant } from '@/context/TenantContext';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { apiService } from '@/lib/apiService';
import { logger } from '@/utils/logger';
import { storeTenantId } from '@/utils/tenantUtils';

// This layout wraps all tenant-specific pages and ensures the tenant ID is set
export default function TenantLayout({ children, params }) {
  const { tenantId } = params;
  
  // If we don't have a tenant ID in the URL, redirect to home
  if (!tenantId) {
    redirect('/');
  }
  
  // Server-side: set the tenant ID cookie if it doesn't match
  const cookieStore = cookies();
  const currentCookieTenantId = cookieStore.get('tenantId')?.value;
  
  if (currentCookieTenantId !== tenantId) {
    // Set the cookie server-side
    cookies().set('tenantId', tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
  }
  
  return (
    <>
      <TenantInitializer tenantId={tenantId} />
      {children}
    </>
  );
}

// Client component to initialize tenant context
'use client';
function TenantInitializer({ tenantId }) {
  const { setTenantId, verifyTenantAccess } = useTenant();
  
  useEffect(() => {
    async function initializeTenant() {
      try {
        logger.info(`Initializing tenant from URL parameter: ${tenantId}`);
        
        // Verify user has access to this tenant
        const accessVerified = await verifyTenantAccess(tenantId);
        
        if (!accessVerified) {
          logger.error(`User doesn't have access to tenant: ${tenantId}`);
          redirect('/unauthorized');
          return;
        }
        
        // Store tenant ID in multiple locations
        storeTenantId(tenantId);
        
        // Set the tenant context
        setTenantId(tenantId);
        
        // Log success
        logger.info(`Tenant context initialized: ${tenantId}`);
      } catch (error) {
        logger.error('Failed to initialize tenant from URL parameter', error);
        redirect('/error?reason=tenant-initialization-failed');
      }
    }
    
    if (tenantId) {
      initializeTenant();
    }
  }, [tenantId, setTenantId, verifyTenantAccess]);
  
  return null;
} 
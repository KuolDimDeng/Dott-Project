'use client';


import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTenantContext } from '@/context/TenantContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * Tenant-specific root page
 * This page acts as a router:
 * - If the user accesses a tenant-specific URL, it sets the tenant ID in context 
 * - It then redirects to the appropriate page based on the user's auth state
 * - For non-authenticated users, it redirects to the home page with tenant context set
 * - For authenticated users, it redirects to the dashboard
 */
export default function TenantRootPage({ params }) {
  const router = useRouter();
  const { setTenantId } = useTenantContext();
  
  useEffect(() => {
    const handleRouting = async () => {
      if (!params) return;
      
      const tenantId = params.tenantId;
      if (!tenantId) return;
      
      // Set the tenant ID in context
      setTenantId(tenantId);
      
      // Redirect to the dashboard
      router.push('/dashboard');
    };
    
    handleRouting();
  }, [params, router, setTenantId]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="large" />
    </div>
  );
}
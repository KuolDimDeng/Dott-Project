'use client';


import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function TenantOnboardingCompletePage({ params }) {
  const router = useRouter();
  const { tenantId } = params;
  
  useEffect(() => {
    // Store the tenant ID in localStorage and cookies for the regular onboarding page to use
    if (tenantId) {
      try {
        localStorage.setItem('tenantId', tenantId.replace(/_/g, '-'));
        document.cookie = `tenantId=${tenantId.replace(/_/g, '-')}; path=/; max-age=${60*60*24*30}; samesite=lax`;
        document.cookie = `businessid=${tenantId.replace(/_/g, '-')}; path=/; max-age=${60*60*24*30}; samesite=lax`;
        
        // Redirect to the main onboarding complete page
        setTimeout(() => {
          router.push('/onboarding/complete?from=tenant_redirect&ts=' + Date.now());
        }, 100);
      } catch (error) {
        console.error('[TenantOnboarding] Error setting tenant data:', error);
        // Redirect anyway
        router.push('/onboarding/complete');
      }
    } else {
      // If no tenant ID, redirect to the main onboarding page
      router.push('/onboarding/complete');
    }
  }, [tenantId, router]);
  
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-lg text-gray-600">Finalizing your account setup...</p>
      </div>
    </div>
  );
} 
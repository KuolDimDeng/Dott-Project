'use client';


// Import necessary components
import { usePathname } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

// Simple hard redirect component
export default function TenantOnboardingSubscriptionPage() {
  const pathname = usePathname();
  
  // Extract tenant ID from URL
  const tenantIdMatch = pathname?.match(/\/tenant\/([^\/]+)/);
  const tenantId = tenantIdMatch ? tenantIdMatch[1].replace(/_/g, '-') : null;

  // Add client-side redirect script directly to the page
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Redirecting to subscription options...</p>
        
        {/* Immediate redirect script */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                // Get tenant ID from path
                const path = window.location.pathname;
                const match = path.match(/\\/tenant\\/([^\\/]+)/);
                const tenantId = match ? match[1].replace(/_/g, '-') : null;
                
                if (tenantId) {
                  // Store tenant ID
                  localStorage.setItem('lastTenantId', tenantId);
                  
                  // Build redirect URL with timestamp to avoid caching
                  const redirectUrl = '/onboarding/subscription?bypass=true&tid=' + 
                    encodeURIComponent(tenantId) + '&ts=' + Date.now();
                  
                  // Execute redirect immediately
                  window.location.href = redirectUrl;
                }
              } catch (e) {
                console.error('Redirect error:', e);
                // Fallback redirect
                window.location.href = '/onboarding/subscription';
              }
            })();
          `
        }} />
      </div>
    </div>
  );
} 
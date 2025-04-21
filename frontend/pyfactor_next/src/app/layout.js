///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
import '../lib/amplifyConfig'; // Import Amplify config early
// Add reconfiguration script for Amplify
import { configureAmplify } from '@/config/amplifyUnified';
import { Inter, Montserrat } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import Script from 'next/script';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import TenantRecoveryWrapper from '@/components/TenantRecoveryWrapper';
import AuthInitializer from '@/components/AuthInitializer';
import ClientSideScripts from '@/components/ClientSideScripts';
// DO NOT directly import scripts here as they will run in server context
// Scripts will be loaded via next/script in the component

const inter = Inter({ subsets: ['latin'] });
const montserrat = Montserrat({ subsets: ['latin'] });

// Using local font styling instead of next/font/google to prevent build errors
export const metadata = {
  title: 'PyFactor - Modern Business Solutions',
  description: 'Streamline your business operations with PyFactor',
};

// Root layout component (Server Component)
export default async function RootLayout({ children, params }) {
  // Extract path from params or request
  const pathname = params?.pathname || '';
  
  // Check if we're already on a tenant path
  const isTenantPath = pathname.startsWith('tenant/');
  
  // Use AppCache instead of cookies for better security
  // This approach is async-compatible and more secure than cookies
  
  let tenantId = null;
  try {
    // Check if there's a tenant ID in AppCache
    const { getFromAppCache } = await import('@/utils/appCacheUtils');
    const tenantIdFromCache = await getFromAppCache('tenantId');
    const businessIdFromCache = await getFromAppCache('businessid');
    tenantId = tenantIdFromCache || businessIdFromCache;
    
    // Only redirect on root route, not on all routes
    // This prevents redirect loops and unnecessary redirects
    if (tenantId && !isTenantPath && pathname === '') {
      return redirect(`/tenant/${tenantId}`);
    }
  } catch (error) {
    console.error('Error accessing AppCache:', error);
  }
  
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Add inline script to configure AWS Amplify early */}
        <script dangerouslySetInnerHTML={{
          __html: `
            // Load AWS Amplify configuration from environment variables
            window.aws_config = {
              Auth: {
                Cognito: {
                  region: '${process.env.NEXT_PUBLIC_AWS_REGION || process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1'}',
                  userPoolId: '${process.env.NEXT_PUBLIC_USER_POOL_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6'}',
                  userPoolClientId: '${process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b'}',
                  loginWith: {
                    email: true,
                    username: true
                  }
                }
              }
            };
            console.log('[Layout] AWS Config initialized:', window.aws_config);
            
            // Add reconfiguration function for auth operations
            window.ensureAmplifyAuth = function() {
              if (window.reconfigureAmplify) {
                console.log('[Layout] Ensuring Amplify auth configuration');
                return window.reconfigureAmplify();
              }
              return false;
            };
            
            // Initialize AppCache structure for dashboard redirect fix
            if (!window.__APP_CACHE) {
              window.__APP_CACHE = { 
                auth: { provider: 'cognito', initialized: true }, 
                user: {}, 
                tenant: {},
                tenants: {}
              };
              console.log('[Layout] AppCache initialized for dashboard redirect fix');
            }
          `
        }} />
      </head>
      <body className={inter.className}>
        <AuthInitializer />
        <ClientSideScripts />
        <TenantRecoveryWrapper showRecoveryState={true}>
          <Providers>
            {children}
          </Providers>
        </TenantRecoveryWrapper>
        <Toaster position="top-right" />
        <Script id="user-session-info" strategy="afterInteractive">
          {`
            // Use app cache functions from window global
            const getCacheValue = window.__APP_CACHE ? (key, defaultValue = null) => {
              const entry = window.__APP_CACHE[key];
              return entry ? (entry.value !== undefined ? entry.value : entry) : defaultValue;
            } : () => null;
            
            console.log('[RootLayout] Page loaded:', {
              pathname: window.location.pathname,
              tenantId: getCacheValue('tenantId'),
              businessId: getCacheValue('businessid')
            });
            
            // Client-side redirection based on AppCache instead of localStorage
            try {
              const path = window.location.pathname;
              if (path === '/' || path === '') {
                const tenantId = getCacheValue('tenantId') || getCacheValue('businessid');
                if (tenantId) {
                  window.location.href = '/tenant/' + tenantId;
                }
              }
            } catch (e) {
              console.error('Error during client-side redirect:', e);
            }
          `}
        </Script>
        
        {/* HTTPS Configuration Script - Accept self-signed certificates */}
        <Script id="https-config" strategy="afterInteractive">
          {`
            // Reset circuit breakers and configure HTTPS
            try {
              // Detect HTTPS mode
              const isHttps = window.location.protocol === 'https:';
              if (isHttps) {
                console.log('[Layout] HTTPS detected, configuring for self-signed certificates');
                
                // Set a flag to let components know we're using HTTPS
                window.__HTTPS_ENABLED = true;
                
                // Reset circuit breakers that may have been triggered when switching protocols
                if (window.__resetCircuitBreakers) {
                  window.__resetCircuitBreakers();
                  console.log('[Layout] Circuit breakers reset for HTTPS mode');
                }
                
                // Add ability to force reset circuit breakers when needed
                window.resetCircuitBreakers = function() {
                  if (window.__resetCircuitBreakers) {
                    window.__resetCircuitBreakers();
                    console.log('[Layout] Circuit breakers manually reset');
                    return true;
                  }
                  return false;
                };
              }
            } catch (e) {
              console.error('Error configuring HTTPS:', e);
            }
          `}
        </Script>
        
        {/* Dashboard redirect fix script initialization */}
        <Script id="dashboard-redirect-fix" strategy="beforeInteractive">
          {`
            // Ensure script is loaded early for dashboard redirects
            if (typeof window !== 'undefined' && !window.__APP_CACHE) {
              window.__APP_CACHE = { 
                auth: { provider: 'cognito', initialized: true }, 
                user: {}, 
                tenant: {},
                tenants: {}
              };
              console.log('[Layout] AppCache initialized for dashboard redirect fix (beforeInteractive)');
            }
          `}
        </Script>
        
        {/* Load fix scripts directly in the browser */}
        <Script 
          id="dashboard-redirect-fix-script" 
          src="/scripts/Version0001_fix_dashboard_redirect_appCache.js"
          strategy="afterInteractive"
        />
        
        <Script 
          id="cognito-attributes-fix-script" 
          src="/scripts/Version0002_fix_cognito_attributes_permissions.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

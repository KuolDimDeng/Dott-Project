///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
import '../lib/amplifyConfig'; // Import Amplify config early
// Add reconfiguration script for Amplify
import { Inter, Montserrat } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import Script from 'next/script';
import { Toaster } from 'react-hot-toast';
import TenantRecoveryWrapper from '@/components/TenantRecoveryWrapper';
import AuthInitializer from '@/components/AuthInitializer';
import ClientSideScripts from '@/components/ClientSideScripts';
// Menu privilege system has been replaced with page privileges
// import MenuPrivilegeInitializer from '@/components/MenuPrivilegeInitializer';
// DO NOT directly import scripts here as they will run in server context
// Scripts will be loaded via next/script in the component

const inter = Inter({ subsets: ['latin'] });
const montserrat = Montserrat({ subsets: ['latin'] });

// Using local font styling instead of next/font/google to prevent build errors
export const metadata = {
  title: 'Dott: Small Business Software',
  description: 'Streamline your business operations with Dott',
};

// Root layout component (Server Component)
export default async function RootLayout({ children, params }) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Direct inline menu fix - highest priority */}
        <script 
          dangerouslySetInnerHTML={{ 
            __html: `
              // Force menu item visibility with inline script
              (function() {
                try {
                  // Add extremely high priority style
                  const style = document.createElement('style');
                  style.innerHTML = '/* Force all second spans in menu buttons to be visible */ body #main-menu-container button span + span, body nav[aria-label="Main Navigation"] button span + span { display: inline-block !important; visibility: visible !important; opacity: 1 !important; position: static !important; color: #1f2937 !important; font-weight: 500 !important; margin-left: 12px !important; }';
                  document.head.appendChild(style);
                  console.log('[InlineMenuFix] Applied emergency inline fix');
                } catch(e) {
                  console.error('[InlineMenuFix] Error applying inline fix:', e);
                }
              })();
            `
          }}
        />
        
        {/* Simplified tenant initialization */}
        <script 
          dangerouslySetInnerHTML={{ 
            __html: `
            // Clean tenant ID extraction using CognitoAttributes utility
            // Replaces test-tenant prevention with proper dynamic extraction
            async function initializeTenantFromCognito() {
              try {
                console.log('[Layout] Initializing tenant ID from Cognito attributes');
                
                // Wait for Amplify to be available
                let attempts = 0;
                while (!window.Amplify && attempts < 10) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                  attempts++;
                }
                
                if (window.Amplify && window.Amplify.Auth) {
                  try {
                    const session = await window.Amplify.Auth.currentSession();
                    if (session && session.idToken && session.idToken.payload) {
                      const payload = session.idToken.payload;
                      
                      // Use proper attribute priority as defined in CognitoAttributes
                      const tenantId = payload['custom:tenant_ID'] || 
                                      payload['custom:businessid'] ||
                                      payload['custom:tenant_id'] ||
                                      payload['custom:tenantId'];
                      
                      if (tenantId) {
                        console.log('[Layout] Found tenant ID from Cognito:', tenantId);
                        
                        // Store in AppCache (no localStorage per requirements)
                        if (window.__APP_CACHE) {
                          window.__APP_CACHE.tenantId = tenantId;
                          window.__APP_CACHE.tenant = { id: tenantId };
                        }
                        
                        // Redirect to tenant-specific URL if on root
                        const path = window.location.pathname;
                        if (path === '/' || path === '') {
                          window.location.href = '/tenant/' + tenantId;
                        }
                        
                        return tenantId;
                      }
                    }
                  } catch (error) {
                    console.log('[Layout] Could not get Cognito session:', error.message);
                  }
                }
                
                // Reduced logging frequency for production
                if (Math.random() < 0.1) { // Only log 10% of the time
                  console.debug('[Layout] No tenant ID found in Cognito attributes');
                }
                return null;
              } catch (error) {
                console.error('[Layout] Error initializing tenant from Cognito:', error);
                return null;
              }
            }
            
            // Initialize tenant ID on page load
            if (typeof window !== 'undefined') {
              // Initialize AppCache if not present
              if (!window.__APP_CACHE) {
                window.__APP_CACHE = { 
                  auth: { provider: 'cognito', initialized: true }, 
                  user: {}, 
                  tenant: {},
                  tenants: {}
                };
              }
              
              // Initialize tenant after a short delay to allow Amplify to load
              setTimeout(initializeTenantFromCognito, 1000);
            }
            `
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthInitializer />
        {/* Menu privilege system has been replaced with page privileges */}
        {/* <MenuPrivilegeInitializer /> */}
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
        
        {/* HTTPS is handled by AWS Certificate Manager and Vercel - no self-signed certificates needed */}
        
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
        
        {/* All interfering scripts removed - using direct code fixes instead */}
      </body>
    </html>
  );
}

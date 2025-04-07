///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
import '../lib/amplifyConfig'; // Import Amplify config early
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import Script from 'next/script';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

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
  
  // We'll skip cookie-based redirection for now to fix the build
  // This approach avoids the cookies() async API completely
  
  /*
  let tenantId = null;
  try {
    // Check if there's a tenant ID in cookies
    const cookiesList = cookies();
    const tenantIdCookie = cookiesList.has('tenantId') ? cookiesList.get('tenantId').value : null;
    const businessIdCookie = cookiesList.has('businessid') ? cookiesList.get('businessid').value : null;
    tenantId = tenantIdCookie || businessIdCookie;
  } catch (error) {
    console.error('Error accessing cookies:', error);
  }
  
  // Only redirect on root route, not on all routes
  // This prevents redirect loops and unnecessary redirects
  if (tenantId && !isTenantPath && pathname === '') {
    return redirect(`/tenant/${tenantId}`);
  }
  */
  
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Add inline script to configure AWS Amplify early */}
        <script dangerouslySetInnerHTML={{
          __html: `
            // Load AWS Amplify configuration from environment variables
            window.aws_config = {
              Auth: {
                region: '${process.env.NEXT_PUBLIC_AWS_REGION || process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1'}',
                userPoolId: '${process.env.NEXT_PUBLIC_USER_POOL_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6'}',
                userPoolWebClientId: '${process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b'}',
                authenticationFlowType: 'USER_SRP_AUTH'
              }
            };
            console.log('[Layout] AWS Config initialized:', window.aws_config);
          `
        }} />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <Script id="user-session-info" strategy="afterInteractive">
          {`
            console.log('[RootLayout] Page loaded:', {
              pathname: window.location.pathname,
              tenantId: localStorage.getItem('tenantId'),
              businessId: localStorage.getItem('businessid')
            });
            
            // Client-side redirection based on local storage
            try {
              const path = window.location.pathname;
              if (path === '/' || path === '') {
                const tenantId = localStorage.getItem('tenantId') || localStorage.getItem('businessid');
                if (tenantId) {
                  window.location.href = '/tenant/' + tenantId;
                }
              }
            } catch (e) {
              console.error('Error during client-side redirect:', e);
            }
          `}
        </Script>
      </body>
    </html>
  );
}

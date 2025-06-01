///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
import { Inter, Montserrat } from 'next/font/google';
import './globals.css';

// Only import these in client environment
let Toaster, Auth0Provider, CookiesProvider;

// Detect if we're in build/static generation mode
const isBuildTime = typeof window === 'undefined' && process.env.NODE_ENV === 'production';

if (!isBuildTime) {
  try {
    const reactHotToast = require('react-hot-toast');
    Toaster = reactHotToast.Toaster;
    
    const auth0NextJS = require('@auth0/nextjs-auth0');
    Auth0Provider = auth0NextJS.Auth0Provider;
    
    const reactCookie = require('react-cookie');
    CookiesProvider = reactCookie.CookiesProvider;
  } catch (error) {
    console.warn('Could not load providers:', error);
  }
}

const inter = Inter({ subsets: ['latin'] });
const montserrat = Montserrat({ subsets: ['latin'] });

// Using local font styling instead of next/font/google to prevent build errors
export const metadata = {
  title: 'Dott: Small Business Software',
  description: 'Streamline your business operations with Dott',
};

// Root layout with conditional providers
export default function RootLayout({ children }) {
  // During build time, use minimal layout
  if (isBuildTime || !CookiesProvider || !Auth0Provider || !Toaster) {
    return (
      <html lang="en" className={`${inter.variable} ${montserrat.variable}`} suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body className={inter.className}>
          {children}
        </body>
      </html>
    );
  }

  // Runtime layout with full providers
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={inter.className}>
        <CookiesProvider>
          <Auth0Provider>
            {children}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </Auth0Provider>
        </CookiesProvider>
      </body>
    </html>
  );
}

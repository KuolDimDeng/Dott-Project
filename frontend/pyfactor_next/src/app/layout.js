///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
import { Inter, Montserrat } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Auth0Provider } from '@auth0/nextjs-auth0';
import { CookiesProvider } from 'react-cookie';
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

// Root layout with Auth0 Provider for client-side authentication
export default function RootLayout({ children }) {
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

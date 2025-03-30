///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
import { Inter } from 'next/font/google';
import ClientLayout from './ClientLayout';
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry';
import Providers from '@/providers';
import LanguageProvider from '@/components/LanguageProvider/LanguageProvider.js';
import { UserProvider } from '@/contexts/UserContext';
import './globals.css';
import DashboardApp from './DashboardApp';

// Dynamic components will be loaded client-side by ClientLayout
const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Dott: Small Business Software',
  description: 'Dott- Business Management Platform',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/static/images/favicon.png', type: 'image/png' }
    ],
    apple: { url: '/static/images/favicon.png', type: 'image/png' },
    shortcut: { url: '/static/images/favicon.png', type: 'image/png' }
  },
};

// Create a client-only wrapper for DynamicComponents
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UserProvider>
          <ThemeRegistry>
            <Providers>
              <LanguageProvider>
                <DashboardApp>
                  <ClientLayout>{children}</ClientLayout>
                  {/* DynamicComponents moved to ClientLayout for proper client-side rendering */}
                </DashboardApp>
              </LanguageProvider>
            </Providers>
          </ThemeRegistry>
        </UserProvider>
      </body>
    </html>
  );
}

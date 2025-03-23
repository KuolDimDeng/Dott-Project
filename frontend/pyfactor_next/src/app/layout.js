///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
import { Inter } from 'next/font/google';
import ClientLayout from './ClientLayout';
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry';
import Providers from '@/providers';
import LanguageProvider from '@/components/LanguageProvider/LanguageProvider.jsx';
import DynamicComponents from '@/components/DynamicComponents';
import './globals.css';
import { UserProvider } from '@/contexts/UserContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Dott: Small Business Software',
  description: 'Dott- Business Management Platform',
  icons: {
    icon: '/static/images/favicon.png',
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
                <ClientLayout>{children}</ClientLayout>
                {/* DynamicComponents will be loaded client-side by ClientLayout */}
                <DynamicComponents isAuthenticated={false} />
              </LanguageProvider>
            </Providers>
          </ThemeRegistry>
        </UserProvider>
      </body>
    </html>
  );
}

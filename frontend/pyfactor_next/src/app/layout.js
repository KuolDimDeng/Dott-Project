///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
import { Inter } from 'next/font/google';
import ClientLayout from './ClientLayout';
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry';
import Providers from '@/providers';
import { LanguageProvider } from '@/components/LanguageProvider/LanguageProvider';
import dynamic from 'next/dynamic';
import './globals.css';

// Dynamically import components to avoid SSR issues
const CookieBanner = dynamic(() => import('@/components/Cookie/CookieBanner'), {
  ssr: false,
});

const CrispChat = dynamic(() => import('@/components/CrispChat/CrispChat'), {
  ssr: false,
});

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Dott: Small Business Software',
  description: 'Dott- Business Management Platform',
  icons: {
    icon: '/static/images/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ThemeRegistry>
            <LanguageProvider>
              <ClientLayout>{children}</ClientLayout>
              <CookieBanner />
              <CrispChat isAuthenticated={false} />
            </LanguageProvider>
          </ThemeRegistry>
        </Providers>
      </body>
    </html>
  );
}

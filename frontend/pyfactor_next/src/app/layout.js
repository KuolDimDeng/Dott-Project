import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import Providers from '@/providers';
import '@/app/globals.css';
import { APP_CONFIG } from '@/config';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: APP_CONFIG?.app?.title || 'Dott: Small Business Platform',
  description: APP_CONFIG?.app?.description || 'Small Business Platform',
  icons: {
    icon: APP_CONFIG?.app?.favicon || '/static/images/favicon.png',
  },
};

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500" />
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body suppressHydrationWarning>
        <Suspense fallback={<Loading />}>
          <Providers>
            {children}
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
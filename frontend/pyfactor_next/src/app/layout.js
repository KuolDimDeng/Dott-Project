///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
import { Inter } from 'next/font/google';
import './globals.css';
import CircuitBreakerWrapper from './CircuitBreakerWrapper';
import ClientProviders from './ClientProviders';
import { Providers } from "./providers";
import ConfigureAmplify from "@/components/ConfigureAmplify";
import '@/config/amplifyConfig';
import '@/utils/mockApiHandler';

// Font configuration
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

// Root layout component
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConfigureAmplify />
        <Providers>
          <CircuitBreakerWrapper>
            <ClientProviders>
              {children}
            </ClientProviders>
          </CircuitBreakerWrapper>
        </Providers>
      </body>
    </html>
  );
}

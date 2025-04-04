///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
import { Inter } from 'next/font/google';
import './globals.css';
import { SimpleProviderWrapper } from './provider-helpers';

// Font configuration
const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'PyFactor',
  description: 'PyFactor Platform',
};

// Root layout component (this is a Server Component)
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Simple client boundary with minimal dependencies */}
        <SimpleProviderWrapper>
          {children}
        </SimpleProviderWrapper>
      </body>
    </html>
  );
}

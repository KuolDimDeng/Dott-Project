///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
import './globals.css';
import { SimpleProviderWrapper } from './provider-helpers';

// Using local font styling instead of next/font/google to prevent build errors
export const metadata = {
  title: 'PyFactor',
  description: 'PyFactor Platform',
};

// Root layout component (Server Component)
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="font-sans antialiased">
        <SimpleProviderWrapper>
          {children}
        </SimpleProviderWrapper>
      </body>
    </html>
  );
}

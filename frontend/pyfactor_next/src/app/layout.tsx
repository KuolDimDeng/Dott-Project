'use client' // Add this directive at the top

import { Inter } from 'next/font/google';
import SignIn from './login/page'; // Import the SignIn component from the correct path
import { usePathname } from 'next/navigation'; // Import the usePathname hook from 'next/navigation'
import React from 'react'; // Import React for TypeScript
import LandingPage from './page';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // Get the current pathname

  // If the current route is '/', render the SignIn component
  if (pathname === '/') {
    return (
      <html lang="en">
        <body className={inter.className}>
          <LandingPage />
        </body>
      </html>
    );
  }

  // For all other routes, render the page content
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
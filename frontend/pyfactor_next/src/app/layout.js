// src/app/layout.js
'use client';

import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import Providers from '@/providers';
import './globals.css';
import { configureAmplify } from '@/config/amplify';

const inter = Inter({ subsets: ['latin'] });

// Initialize Amplify
configureAmplify();

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <Providers>
          {children}
          </Providers>
        </ToastProvider>
      </body>
    </html>
  );
}

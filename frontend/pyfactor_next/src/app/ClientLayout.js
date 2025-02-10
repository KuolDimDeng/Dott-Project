'use client';

import { ToastProvider } from '@/components/Toast/ToastProvider';
import Providers from '@/providers';
import { configureAmplify } from '@/config/amplify';

// Initialize Amplify
configureAmplify();

export default function ClientLayout({ children }) {
  return (
    <ToastProvider>
      <Providers>{children}</Providers>
    </ToastProvider>
  );
}

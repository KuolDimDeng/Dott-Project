'use client';

import { UserProvider } from '@auth0/nextjs-auth0/client';
import { auth0Config } from '@/config/auth0';

export default function Auth0Provider({ children }) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  );
} 
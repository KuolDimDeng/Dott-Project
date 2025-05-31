'use client';

import { Auth0Provider as Auth0ProviderComponent } from '@auth0/nextjs-auth0';
import { auth0Config } from '@/config/auth0';

export default function Auth0Provider({ children }) {
  return (
    <Auth0ProviderComponent>
      {children}
    </Auth0ProviderComponent>
  );
} 
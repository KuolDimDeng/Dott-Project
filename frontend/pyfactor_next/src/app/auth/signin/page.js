'use client';

import React from 'react';
import EmailPasswordSignIn from '@/components/auth/EmailPasswordSignIn';

export default function SignInPage() {
  // Render the EmailPasswordSignIn component directly instead of redirecting
  // This prevents the redirect loop between signin and email-signin pages
  return <EmailPasswordSignIn />;
}
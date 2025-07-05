'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmailSignInPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the main signin page
    router.replace('/auth/signin');
  }, [router]);
  
  return null;
}
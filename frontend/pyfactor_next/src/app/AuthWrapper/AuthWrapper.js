'use client';

import { useSessionContext } from '@/providers/SessionProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { SafeWrapper } from '@/utils/ContextFix';

export function AuthWrapper({ children }) {
  const { isAuthenticated, loading, user } = useSessionContext();
  const router = useRouter();
  const pathname = usePathname();

  // Skip auth check for admin routes
  const isAdminRoute = pathname?.startsWith('/admin');

  console.log('🔧 [AuthWrapper] Auth check:', {
    loading,
    isAuthenticated,
    hasUser: !!user,
    userEmail: user?.email,
    pathname,
    isAdminRoute
  });

  useEffect(() => {
    // Skip auth check for admin routes
    if (isAdminRoute) {
      return;
    }

    // Only redirect if not loading and not authenticated
    if (!loading && !isAuthenticated) {
      console.log('🔧 [AuthWrapper] User not authenticated, redirecting to signin');
      router.push('/auth/signin');
    }
  }, [loading, isAuthenticated, router, isAdminRoute]);

  // Skip auth check for admin routes - render children directly
  if (isAdminRoute) {
    console.log('🔧 [AuthWrapper] Admin route detected, bypassing auth check');
    return <SafeWrapper>{children}</SafeWrapper>;
  }

  // Show loading spinner while checking session
  if (loading) {
    console.log('🔧 [AuthWrapper] Showing loading spinner');
    return <LoadingSpinner fullscreen={true} message="" />;
  }

  // If not authenticated, don't render children (redirect will happen)
  if (!isAuthenticated) {
    console.log('🔧 [AuthWrapper] Not authenticated, rendering loading');
    return <LoadingSpinner fullscreen={true} message="" />;
  }

  console.log('🔧 [AuthWrapper] User authenticated, rendering children');
  return <SafeWrapper>{children}</SafeWrapper>;
}

export default AuthWrapper;

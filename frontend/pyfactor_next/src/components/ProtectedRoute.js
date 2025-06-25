'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';

const PROTECTED_ROUTES = {
  // Sales Management
  '/dashboard/products': 'read',
  '/dashboard/services': 'read',
  '/dashboard/customers': 'read',
  '/dashboard/invoices': 'read',
  '/dashboard/quotes': 'read',
  '/dashboard/payments': 'read',
  '/dashboard/inventory': 'read',
  
  // HR Management
  '/dashboard/employees': 'read',
  '/dashboard/benefits': 'read',
  '/dashboard/leave': 'read',
  '/dashboard/payroll': 'read',
  
  // Finance
  '/dashboard/expenses': 'read',
  '/dashboard/reports': 'read',
  '/dashboard/taxes': 'read',
  
  // System (Owner/Admin only)
  '/settings/users': 'read',
  '/settings/subscription': 'read',
  '/settings/close-account': 'read'
};

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { canAccessRoute, isLoading, user } = usePermissions();
  const [hasAccess, setHasAccess] = useState(true);
  
  useEffect(() => {
    if (isLoading) return;
    
    // Extract the base path without tenant ID
    const pathMatch = pathname.match(/^\/[^\/]+(\/.*)$/);
    const basePath = pathMatch ? pathMatch[1] : pathname;
    
    // Check if this is a protected route
    if (PROTECTED_ROUTES[basePath]) {
      const canAccess = canAccessRoute(basePath);
      setHasAccess(canAccess);
      
      if (!canAccess) {
        // Redirect to access denied page
        const url = new URL('/access-denied', window.location.origin);
        url.searchParams.set('path', basePath);
        url.searchParams.set('reason', user ? 'no_permission' : 'not_authenticated');
        router.replace(url.toString());
      }
    }
  }, [pathname, canAccessRoute, isLoading, user, router]);
  
  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Don't render children if no access
  if (!hasAccess) {
    return null;
  }
  
  return children;
}
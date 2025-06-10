'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// Dynamically import CrispChat to avoid SSR issues
const CrispChat = dynamic(() => import('@/components/CrispChat/CrispChat'), {
  ssr: false,
  loading: () => null
});

export default function CrispChatProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  
  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/profile');
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [pathname]); // Re-check when route changes
  
  // Don't render CrispChat on auth pages
  const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/signin';
  
  return (
    <>
      {children}
      {!isAuthPage && !isLoading && (
        <CrispChat 
          isAuthenticated={isAuthenticated} 
          user={user}
        />
      )}
    </>
  );
}

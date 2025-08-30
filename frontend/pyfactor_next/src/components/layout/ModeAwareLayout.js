'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ModeSwitcher from '@/components/navigation/ModeSwitcher';
import { useSession } from '@/hooks/useSession-v2';

export default function ModeAwareLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading } = useSession();
  const [userMode, setUserMode] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!loading && session?.user) {
      initializeUserMode();
    }
  }, [session, loading]);

  const initializeUserMode = async () => {
    try {
      // Get user mode from API
      const response = await fetch('/api/users/mode', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserMode(data.current_mode);
        
        // Store in localStorage
        localStorage.setItem('user_mode', data.current_mode);
        
        // Redirect based on mode and current path
        handleModeBasedRedirect(data.current_mode);
      }
    } catch (error) {
      console.error('Error initializing user mode:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  const handleModeBasedRedirect = (mode) => {
    // Don't redirect on auth or onboarding pages
    if (pathname?.includes('/auth') || pathname?.includes('/onboarding')) {
      return;
    }
    
    // If on root, redirect to appropriate dashboard
    if (pathname === '/' || pathname === '/dashboard') {
      if (mode === 'consumer') {
        router.push('/consumer/dashboard');
      } else if (mode === 'business') {
        router.push('/dashboard');
      }
    }
    
    // If consumer trying to access business pages
    if (mode === 'consumer' && isBusinessPath(pathname)) {
      router.push('/consumer/dashboard');
    }
    
    // If business trying to access consumer pages
    if (mode === 'business' && isConsumerPath(pathname)) {
      router.push('/dashboard');
    }
  };

  const isBusinessPath = (path) => {
    const businessPaths = [
      '/dashboard',
      '/inventory',
      '/sales',
      '/expenses',
      '/reports',
      '/employees',
      '/settings/business'
    ];
    return businessPaths.some(bp => path?.startsWith(bp));
  };

  const isConsumerPath = (path) => {
    const consumerPaths = [
      '/consumer',
      '/search',
      '/cart',
      '/orders/consumer'
    ];
    return consumerPaths.some(cp => path?.startsWith(cp));
  };

  // Navigation items based on mode
  const getNavigationItems = () => {
    if (userMode === 'business') {
      return [
        { name: 'Dashboard', href: '/dashboard', icon: 'HomeIcon' },
        { name: 'Sales', href: '/sales', icon: 'CurrencyDollarIcon' },
        { name: 'Inventory', href: '/inventory', icon: 'CubeIcon' },
        { name: 'Customers', href: '/customers', icon: 'UsersIcon' },
        { name: 'Reports', href: '/reports', icon: 'ChartBarIcon' },
      ];
    } else if (userMode === 'consumer') {
      return [
        { name: 'Home', href: '/consumer/dashboard', icon: 'HomeIcon' },
        { name: 'Search', href: '/consumer/search', icon: 'MagnifyingGlassIcon' },
        { name: 'Orders', href: '/consumer/orders', icon: 'ShoppingBagIcon' },
        { name: 'Chats', href: '/consumer/chats', icon: 'ChatBubbleLeftRightIcon' },
        { name: 'Favorites', href: '/consumer/favorites', icon: 'HeartIcon' },
      ];
    }
    return [];
  };

  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Mode Switcher */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {userMode === 'business' ? 'Dott Business' : 'Dott Marketplace'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Mode Switcher */}
              <ModeSwitcher />
              
              {/* User Menu */}
              <div className="flex items-center">
                <button className="p-2 text-gray-600 hover:text-gray-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation based on mode */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {getNavigationItems().map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`py-2 px-1 border-b-2 text-sm font-medium ${
                  pathname === item.href
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
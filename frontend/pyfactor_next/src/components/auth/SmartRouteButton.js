'use client';


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { smartNavigate, determineUserRoute, ROUTE_TYPES } from '@/utils/smartRouting';
import { logger } from '@/utils/logger';

export default function SmartRouteButton({ className = '', children = 'Smart Navigate' }) {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);

  const handleSmartNavigation = async () => {
    setIsNavigating(true);
    try {
      logger.debug('[SmartRouteButton] Starting smart navigation');
      
      // Get route information
      const routeData = await determineUserRoute();
      setRouteInfo(routeData);
      
      logger.debug('[SmartRouteButton] Route determined:', routeData);
      
      // Navigate using smart routing
      await smartNavigate(router);
      
    } catch (error) {
      logger.error('[SmartRouteButton] Error in smart navigation:', error);
    } finally {
      setIsNavigating(false);
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'Loading...';
    if (isNavigating) return 'Navigating...';
    
    if (routeInfo) {
      switch (routeInfo.type) {
        case ROUTE_TYPES.NEW_USER:
          return '🆕 Start Onboarding';
        case ROUTE_TYPES.RESUME_ONBOARDING:
          return '⏩ Resume Setup';
        case ROUTE_TYPES.COMPLETE_USER:
          return '🏠 Go to Dashboard';
        default:
          return '🎯 Smart Navigate';
      }
    }
    
    return children;
  };

  if (!user && !isLoading) {
    return (
      <a
        href="/api/auth/login"
        className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${className}`}
      >
        🔑 Sign In
      </a>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleSmartNavigation}
        disabled={isLoading || isNavigating}
        className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {getButtonText()}
      </button>
      
      {routeInfo && (
        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded border">
          <div><strong>Type:</strong> {routeInfo.type}</div>
          <div><strong>Route:</strong> {routeInfo.route}</div>
          <div><strong>Reason:</strong> {routeInfo.reason}</div>
          {routeInfo.step && <div><strong>Step:</strong> {routeInfo.step}</div>}
          {routeInfo.tenantId && <div><strong>Tenant:</strong> {routeInfo.tenantId}</div>}
        </div>
      )}
    </div>
  );
} 
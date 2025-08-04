'use client';

import React, { Suspense, useMemo } from 'react';
import { StandardSpinner } from '@/components/ui/StandardSpinner';
import { routeRegistry } from './routeRegistry';
import RouteErrorBoundary from '@/shared/components/RouteErrorBoundary';

/**
 * DashboardRouter - Clean routing system
 * Replaces the massive 3,119 line RenderMainContent.js switch statement
 */
const DashboardRouter = ({ 
  view, 
  subView, 
  userData,
  ...routeProps 
}) => {
  // Get the component for the current view
  const RouteComponent = useMemo(() => {
    const route = routeRegistry[view];
    
    if (!route) {
      console.warn(`[DashboardRouter] No route found for view: ${view}`);
      return null;
    }

    return route.component;
  }, [view]);

  // Show loading if no component found
  if (!RouteComponent) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          View Not Found
        </h2>
        <p className="text-gray-500">
          The requested view "{view}" could not be loaded.
        </p>
      </div>
    );
  }

  // Render the component with error boundary
  return (
    <RouteErrorBoundary routeName={view}>
      <Suspense fallback={<StandardSpinner />}>
        <RouteComponent 
          subView={subView}
          userData={userData}
          {...routeProps}
        />
      </Suspense>
    </RouteErrorBoundary>
  );
};

export default DashboardRouter;

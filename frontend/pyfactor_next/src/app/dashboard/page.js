///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/page.js
'use client';

import React, { Suspense } from 'react';
import DashboardContent from './DashboardContent';
import Loading from './loading';

/**
 * Dashboard Page Component
 *
 * This is the main entry point for the dashboard.
 * It uses code splitting and progressive loading to reduce memory usage.
 * It also checks for schema setup status and shows appropriate loading states.
 */
export default function DashboardPage() {
  return (
    <div className="w-full min-h-screen bg-white">
      <Suspense fallback={<Loading />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
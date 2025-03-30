///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/page.js
import React from 'react';
import DashboardClient from './DashboardClient';

/**
 * Dashboard Page Component
 *
 * This is the main entry point for the dashboard.
 * It uses code splitting and progressive loading to reduce memory usage.
 * It also checks for schema setup status and shows appropriate loading states.
 */

// Server component for metadata
export const metadata = {
  title: 'Dashboard',
  description: 'PyFactor Dashboard',
};

export default function DashboardPage() {
  // The server component imports the client component that handles the dynamic import
  return <DashboardClient />;
}
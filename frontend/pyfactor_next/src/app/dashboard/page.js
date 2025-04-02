///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/page.js
import DashboardClient from './DashboardClient';

/**
 * Dashboard Page Component
 *
 * This is the main entry point for the dashboard.
 * A server component that exports metadata and renders the client component.
 */

export const metadata = {
  title: 'PyFactor Dashboard',
  description: 'Manage your business finances with PyFactor',
};

// Server component that simply renders the client component
export default function DashboardPage() {
  return <DashboardClient />;
}
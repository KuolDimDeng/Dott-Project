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

// Server component that handles searchParams
export default async function Dashboard({ searchParams }) {
  // Extract query parameters safely with await to fix the sync-dynamic-apis error
  const params = await searchParams;
  const newAccount = params?.newAccount === 'true';
  const plan = params?.plan || 'free';
  
  return <DashboardClient newAccount={newAccount} plan={plan} />;
} 
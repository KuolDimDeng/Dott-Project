import DashboardWrapper from './DashboardWrapper';

/**
 * Dashboard Page Component
 *
 * This is the main entry point for the dashboard.
 * A server component that exports metadata and renders the client component.
 */

const defaultMetadata = {
  title: 'Dashboard - Juba Made It',
  description: 'View and manage your business data on our dashboard.'
};

export const metadata = defaultMetadata;

// Server component that handles searchParams with proper async handling
export default async function DashboardPage({ searchParams }) {
  // In Next.js 15, we need to await searchParams before using its properties
  const params = await Promise.resolve(searchParams);
  
  // Now we can safely access the properties
  const isNewAccount = params?.newAccount === 'true';
  const planParam = params?.plan || null;

  return <DashboardWrapper newAccount={isNewAccount} plan={planParam} />;
} 
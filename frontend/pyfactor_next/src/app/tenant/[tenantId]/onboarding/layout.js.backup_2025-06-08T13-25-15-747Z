// Changing to a server component since we need to await params
import { redirect } from 'next/navigation';

// This layout is a server component that wraps all tenant-specific onboarding pages
export default async function TenantOnboardingLayout({ children, params }) {
  // In Next.js 15, we must await params
  const resolvedParams = await params;
  const tenantId = resolvedParams.tenantId;
  
  // No redirection or validation logic here - just pass through
  // This just makes the tenantId params properly resolved
  
  return children;
} 
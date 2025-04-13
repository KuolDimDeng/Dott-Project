import { redirect } from 'next/navigation';
import TenantInitializer from './TenantInitializer';

// This layout is a server component that wraps all tenant-specific pages
export default async function TenantLayout({ children, params }) {
  try {
    // Get the tenant ID from params (properly awaited for Next.js 15+)
    const tenantId = params?.tenantId;
    
    // If we don't have a tenant ID in the URL, redirect to home
    if (!tenantId) {
      redirect('/');
    }
    
    // No longer need to set cookies since we're using Cognito for tenant ID
    
    return (
      <>
        <TenantInitializer tenantId={tenantId} />
        {children}
      </>
    );
  } catch (error) {
    // If any error occurs during rendering, redirect to the dashboard
    console.error('TenantLayout error:', error);
    redirect('/dashboard');
  }
} 
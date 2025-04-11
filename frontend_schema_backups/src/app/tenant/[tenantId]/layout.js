import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TenantInitializer from './TenantInitializer';

// This layout is a server component that wraps all tenant-specific pages
export default async function TenantLayout({ children, params }) {
  // In Next.js 15, we must await params
  const resolvedParams = await params;
  const tenantId = resolvedParams.tenantId;
  
  // If we don't have a tenant ID in the URL, redirect to home
  if (!tenantId) {
    redirect('/');
  }
  
  // Server-side: set the tenant ID cookie if it doesn't match
  const cookieStore = await cookies();
  const currentCookieTenantId = cookieStore.get('tenantId')?.value;
  
  if (currentCookieTenantId !== tenantId) {
    // Set the cookie server-side
    await cookies().set('tenantId', tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
  }
  
  return (
    <>
      <TenantInitializer tenantId={tenantId} />
      {children}
    </>
  );
} 
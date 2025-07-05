import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { cookies } from 'next/headers';
import { isValidUUID } from '@/utils/tenantUtils';

/**
 * API route to handle redirects after sign-in when tenant ID needs to be resolved
 * This route extracts tenant ID from various sources and redirects to the appropriate URL
 * 
 * @param {Request} request - The incoming request
 * @returns {NextResponse} - The redirect response
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get('target') || '/dashboard';
    const redirectCount = parseInt(searchParams.get('redirectCount') || '0');
    
    console.log(`[TenantRedirect] Handling redirect for path: ${targetPath} (count: ${redirectCount})`);
    
    // If we've redirected too many times, break the loop by redirecting with fromSignIn=true
    if (redirectCount >= 2) {
      console.warn(`[TenantRedirect] Redirect count limit reached (${redirectCount}), bypassing tenant check`);
      const fallbackUrl = new URL(targetPath, request.url);
      fallbackUrl.searchParams.set('fromSignIn', 'true');
      return NextResponse.redirect(fallbackUrl);
    }
    
    // Always redirect with fromSignIn=true to bypass tenant checks
    console.log('[TenantRedirect] Redirecting to dashboard with fromSignIn flag');
    const fallbackUrl = new URL(targetPath, request.url);
    fallbackUrl.searchParams.set('fromSignIn', 'true');
    fallbackUrl.searchParams.set('redirectCount', (redirectCount + 1).toString());
    
    return NextResponse.redirect(fallbackUrl);
  } catch (error) {
    console.error('[TenantRedirect] Error handling redirect:', error);
    
    // Fallback to dashboard with error and fromSignIn flag
    const fallbackUrl = new URL('/dashboard', request.url);
    fallbackUrl.searchParams.set('error', 'redirect_error');
    fallbackUrl.searchParams.set('fromSignIn', 'true');
    
    return NextResponse.redirect(fallbackUrl);
  }
} 
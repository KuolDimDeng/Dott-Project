import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    // Parse form data
    const formData = await request.formData();
    const token = formData.get('token');
    const redirectUrl = formData.get('redirectUrl');
    const timestamp = formData.get('timestamp');
    
    // Validate inputs
    if (!token || !redirectUrl) {
      logger.error('[EstablishSession] Missing required parameters');
      return redirect('/auth/signin?error=invalid_request');
    }
    
    // Verify timestamp is recent (within 60 seconds)
    const requestTime = parseInt(timestamp);
    if (isNaN(requestTime) || Date.now() - requestTime > 60000) {
      logger.error('[EstablishSession] Request expired');
      return redirect('/auth/signin?error=request_expired');
    }
    
    // Validate redirect URL to prevent open redirects
    const validRedirectPaths = ['/dashboard', '/onboarding'];
    const redirectPath = new URL(redirectUrl, request.url).pathname;
    const isValidRedirect = validRedirectPaths.some(path => 
      redirectPath === path || redirectPath.startsWith(`/${path}`) || 
      redirectPath.match(/^\/[a-zA-Z0-9-]+\/dashboard$/)
    );
    
    if (!isValidRedirect) {
      logger.error('[EstablishSession] Invalid redirect URL:', redirectUrl);
      return redirect('/auth/signin?error=invalid_redirect');
    }
    
    // Set the session cookie securely
    const cookieStore = await cookies();
    
    // Set main session token
    cookieStore.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // Strict for financial data
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
      domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
    });
    
    // Set session fingerprint (will be validated on each request)
    const fingerprint = request.headers.get('user-agent') + 
                       request.headers.get('accept-language') +
                       request.headers.get('sec-ch-ua');
    
    const { createHash } = await import('crypto');
    const fingerprintHash = createHash('sha256')
      .update(fingerprint)
      .digest('hex')
      .substring(0, 16);
    
    cookieStore.set('session_fp', fingerprintHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24
    });
    
    logger.info('[EstablishSession] Session established successfully');
    
    // Redirect to the requested URL
    return redirect(redirectUrl);
    
  } catch (error) {
    logger.error('[EstablishSession] Error:', error);
    return redirect('/auth/signin?error=session_error');
  }
}
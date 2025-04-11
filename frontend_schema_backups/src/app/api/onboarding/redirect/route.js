import { NextResponse } from 'next/server';

/**
 * Server-side redirect handler for onboarding navigation
 * This provides a reliable way to navigate between onboarding steps
 * while ensuring cookies are properly set and included in the next request
 */
export async function POST(request) {
  try {
    // Parse the form data from the request
    const formData = await request.formData();
    
    // Get the target URL from the form data
    const redirectUrl = formData.get('redirectUrl') || '/onboarding/subscription';
    
    // Create a new URL object to add parameters
    const url = new URL(redirectUrl, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    
    // Add all form data as query parameters
    for (const [key, value] of formData.entries()) {
      // Skip the redirectUrl itself to avoid circular references
      if (key !== 'redirectUrl') {
        url.searchParams.set(key, value);
      }
    }
    
    // Ensure we have a timestamp to prevent caching
    if (!url.searchParams.has('ts')) {
      url.searchParams.set('ts', Date.now().toString());
    }
    
    // Create a response with a 307 Temporary Redirect status
    const response = NextResponse.redirect(url, 307);
    
    // Set essential cookies to help with the onboarding flow
    // These will be included in the redirect request
    response.cookies.set('onboardingStep', 'subscription', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'strict'
    });
    
    response.cookies.set('onboardedStatus', 'BUSINESS_INFO', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'strict'
    });
    
    // Add the business name if provided
    const businessName = formData.get('businessName');
    if (businessName) {
      response.cookies.set('businessName', businessName, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'strict'
      });
    }
    
    // Add the business type if provided
    const businessType = formData.get('businessType');
    if (businessType) {
      response.cookies.set('businessType', businessType, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'strict'
      });
    }
    
    // For debugging, log what we're doing
    console.log(`[API] Redirecting to ${url.toString()} with cookies`);
    
    return response;
  } catch (error) {
    console.error('[API] Error in redirect handler:', error);
    
    // In case of error, redirect to subscription page anyway as fallback
    const fallbackUrl = new URL('/onboarding/subscription', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    fallbackUrl.searchParams.set('error', 'redirect_failed');
    fallbackUrl.searchParams.set('ts', Date.now().toString());
    
    return NextResponse.redirect(fallbackUrl, 307);
  }
} 
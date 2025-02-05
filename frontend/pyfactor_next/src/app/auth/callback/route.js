// src/app/auth/callback/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// Force dynamic rendering for auth callback
export const dynamic = 'force-dynamic';

// Disable response caching
export const revalidate = 0;

export async function GET(request) {
  const startTime = Date.now();
  logger.info('Auth callback initiated');

  try {
    const requestUrl = new URL(request.url);
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Handle code-based flow
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    
    logger.debug('Auth callback params', { 
      hasCode: !!code,
      hasError: !!error,
      url: requestUrl.toString() 
    });

    if (error) {
      logger.error('OAuth error received:', error);
      return NextResponse.redirect(
        new URL(`/auth/signin?error=${encodeURIComponent(error)}`, requestUrl.origin)
      );
    }

    if (!code) {
      logger.error('No authorization code found');
      return NextResponse.redirect(
        new URL('/auth/signin?error=no_code', requestUrl.origin)
      );
    }

    // Exchange code for session
    logger.debug('Exchanging code for session');
    const { data: { session }, error: sessionError } = 
      await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      logger.error('Session exchange failed:', sessionError);
      throw sessionError;
    }

    logger.info('Session established', { userId: session.user.id });

    // Check/create onboarding status
    // Create or get onboarding status
    let onboardingStatus;
    try {
      // Try to get existing status
      const { data: existingStatus, error: fetchError } = await supabase
        .from('onboarding')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (!fetchError && existingStatus) {
        onboardingStatus = existingStatus;
        logger.info('Found existing onboarding status', { 
          currentStep: existingStatus.current_step,
          isComplete: existingStatus.setup_completed 
        });
      } else if (fetchError && fetchError.code === 'PGRST116') {
        // No record found, create new status
        const { data: newStatus, error: insertError } = await supabase
          .from('onboarding')
          .insert({
            user_id: session.user.id,
            current_step: 'business-info',
            business_info_completed: false,
            subscription_completed: false,
            payment_completed: false,
            setup_completed: false
          })
          .select()
          .single();

        if (insertError) {
          logger.error('Failed to create onboarding status:', insertError);
          throw insertError;
        }

        onboardingStatus = newStatus;
        logger.info('Created new onboarding status');
      } else {
        // Unexpected error during fetch
        logger.error('Unexpected error fetching onboarding status:', fetchError);
        throw fetchError;
      }

      // Default to business-info if no status exists or if current_step is missing
      const redirectStep = onboardingStatus?.current_step || 'business-info';
      const redirectUrl = onboardingStatus?.setup_completed
        ? '/dashboard'
        : `/onboarding/${redirectStep}`;

      // Create response with redirect
      const response = NextResponse.redirect(new URL(redirectUrl, requestUrl.origin));

      // Set auth cookie
      const cookieName = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]}-auth-token`;
      const cookieValue = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: 'bearer',
        provider_token: session.provider_token,
        provider_refresh_token: session.provider_refresh_token,
        user: session.user
      });

      // Set the cookie with proper attributes
      response.cookies.set(cookieName, cookieValue, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });

      // Update session in Supabase
      await supabase.auth.setSession(session);

      logger.debug('Auth session and cookie set successfully');
      return response;

    } catch (error) {
      logger.error('Failed to handle onboarding status:', error);
      // Default to business-info step on error
      return NextResponse.redirect(new URL('/onboarding/business-info', requestUrl.origin));
    }

  } catch (error) {
    logger.error('Auth callback failed:', error);
    const errorUrl = new URL('/auth/signin', request.url);
    errorUrl.searchParams.set('error', 'auth_callback_failed');
    errorUrl.searchParams.set('message', error.message);
    return NextResponse.redirect(errorUrl);
  } finally {
    logger.info('Auth callback completed', { 
      durationMs: Date.now() - startTime 
    });
  }
}

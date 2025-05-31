import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { setCacheValue } from '@/utils/appCache';

// Token cache constants
const TOKEN_CACHE_KEY = 'auth_tokens';
const TOKEN_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Handles GET requests from Auth0 callback
 * Redirects to the callback page where smart routing happens
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    logger.debug('[AUTH CALLBACK] Auth0 callback received:', { 
      hasCode: !!code, 
      hasState: !!state, 
      error 
    });
    
    if (error) {
      logger.error('[AUTH CALLBACK] Auth0 returned error:', error);
      return NextResponse.redirect(new URL('/auth/signin?error=auth0_error', request.url));
    }
    
    if (!code) {
      logger.error('[AUTH CALLBACK] No authorization code received');
      return NextResponse.redirect(new URL('/auth/signin?error=no_code', request.url));
    }
    
    // Redirect to the callback page where Auth0 will handle the token exchange
    // and our smart routing logic will execute
    const callbackUrl = new URL('/auth/callback', request.url);
    callbackUrl.searchParams.set('code', code);
    if (state) callbackUrl.searchParams.set('state', state);
    
    logger.debug('[AUTH CALLBACK] Redirecting to callback page for smart routing');
    return NextResponse.redirect(callbackUrl);
    
  } catch (error) {
    logger.error('[AUTH CALLBACK] Error in Auth0 callback:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=callback_error', request.url));
  }
}

/**
 * Handles POST requests to the auth callback endpoint
 * Processes the token and returns info required for client-side handling
 */
export async function POST(request) {
  try {
    logger.debug('[AUTH CALLBACK] Processing auth callback request');
    
    // Parse the request body
    const body = await request.json();
    
    // Check if we have the required tokens in the request body
    if (!body?.accessToken) {
      logger.error('[AUTH CALLBACK] Missing access token in request body');
      return NextResponse.json({ error: 'Missing access token' }, { status: 400 });
    }
    
    // Cache token for potential recovery scenarios
    try {
      logger.debug('[AUTH CALLBACK] Caching token for resilience');
      setCacheValue(TOKEN_CACHE_KEY, {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken || null,
        idToken: body.idToken || null,
        timestamp: Date.now()
      }, { ttl: TOKEN_CACHE_TTL });
    } catch (cacheError) {
      logger.warn('[AUTH CALLBACK] Error caching token:', cacheError);
      // Non-fatal error, continue
    }
    
    // Simply pass back the token to the client
    // All token processing happens on the client side
    return NextResponse.json({
      success: true,
      accessToken: body.accessToken,
      message: "Token received, client should process the token"
    });
    
  } catch (error) {
    logger.error('[AUTH CALLBACK] Error processing auth callback', error);
    return NextResponse.json({ 
      error: 'Error processing auth callback',
      message: error.message
    }, { status: 500 });
  }
}
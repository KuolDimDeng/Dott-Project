import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

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
    
    // Simply pass back the token to the client
    // All token processing happens on the client side
    return NextResponse.json({
      success: true,
      accessToken: body.accessToken,
      message: "Token received, client should process the token"
    });
    
  } catch (error) {
    logger.error('[AUTH CALLBACK] Error processing auth callback', error);
    return NextResponse.json({ error: 'Error processing auth callback' }, { status: 500 });
  }
}
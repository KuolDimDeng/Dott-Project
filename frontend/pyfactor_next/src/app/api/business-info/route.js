import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * Handles redirection for GET requests to the correct API endpoint
 */
export async function GET(request) {
  logger.debug('[API:business-info] Redirecting to /api/onboarding/business-info');
  return NextResponse.redirect(new URL('/api/onboarding/business-info', request.url));
}

/**
 * Handles redirection for POST requests to the correct API endpoint
 */
export async function POST(request) {
  logger.debug('[API:business-info] Redirecting POST to /api/onboarding/business-info');
  
  // Use a 307 Temporary Redirect to preserve the POST method and body
  return NextResponse.redirect(new URL('/api/onboarding/business-info', request.url), {
    status: 307 // Temporary redirect that preserves the method and body
  });
} 
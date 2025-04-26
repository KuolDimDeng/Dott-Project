/**
 * This file replaces the previous mock HR employees API route.
 * In production, all requests should go to the real backend API.
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * GET handler for employees data - now redirects to the real backend
 */
export async function GET(request) {
  logger.warn('[HR API] Mock API route has been disabled. All requests should use the real backend API.');
  
  return NextResponse.json(
    { 
      error: 'Mock API disabled', 
      message: 'This mock API route has been disabled. Please use the real backend API.' 
    },
    { status: 501 }
  );
}

import { NextResponse } from 'next/server';
import { generateCSRFToken } from '@/utils/csrf';

/**
 * Generate a CSRF token for secure API calls
 */
export async function GET() {
  try {
    const csrfToken = generateCSRFToken();
    
    return NextResponse.json({
      csrfToken
    });
  } catch (error) {
    console.error('[CSRF] Error generating token:', error);
    return NextResponse.json({ 
      error: 'Failed to generate CSRF token' 
    }, { status: 500 });
  }
}
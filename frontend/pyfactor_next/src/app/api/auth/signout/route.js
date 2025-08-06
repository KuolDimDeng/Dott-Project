/**
 * Sign Out API Route
 * Industry-standard session termination
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { destroySession, clearSessionCookies } from '@/lib/auth/session-manager';

/**
 * POST /api/auth/signout
 * Destroys session and clears cookies
 */
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    // Destroy session on backend if exists
    if (sessionId?.value) {
      await destroySession(sessionId.value);
    }
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Sign out successful'
    });
    
    // Clear all session cookies
    clearSessionCookies(response);
    
    return response;
  } catch (error) {
    console.error('[SignOut] Error:', error);
    
    // Even if backend fails, clear cookies
    const response = NextResponse.json({
      success: true,
      message: 'Sign out completed'
    });
    
    clearSessionCookies(response);
    
    return response;
  }
}

/**
 * GET /api/auth/signout
 * Alternative method for sign out
 */
export async function GET(request) {
  return POST(request);
}
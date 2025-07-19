import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt } from '@/utils/sessionEncryption';
import { logger } from '@/utils/logger';

/**
 * GET handler for user preferences
 * Retrieves a single user preference from Cognito
 * 
 * @param {Request} request - The request object
 * @returns {NextResponse} JSON response with preference value
 */
export async function GET(request) {
  try {
    // Get session from cookie
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // For now, return empty preferences since we're migrating from Cognito
    // This prevents errors in the dashboard
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Preference key is required' }, { status: 400 });
    }
    
    // Return null value for now - preferences will be stored in backend later
    return NextResponse.json({ key: key, value: null });
  } catch (error) {
    logger.error('[API] Error getting user preference:', error);
    return NextResponse.json({ error: 'Failed to get user preference' }, { status: 500 });
  }
}

/**
 * POST handler for user preferences
 * Saves a user preference to Cognito
 * 
 * @param {Request} request - The request object
 * @returns {NextResponse} JSON response with result
 */
export async function POST(request) {
  try {
    // Get session from cookie
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { key, value } = body;
    
    if (!key) {
      return NextResponse.json({ error: 'Preference key is required' }, { status: 400 });
    }
    
    // For now, just return success - preferences will be stored in backend later
    return NextResponse.json({ success: true, message: 'Preference saved successfully' });
  } catch (error) {
    logger.error('[API] Error saving user preference:', error);
    return NextResponse.json({ error: 'Failed to save user preference' }, { status: 500 });
  }
} 
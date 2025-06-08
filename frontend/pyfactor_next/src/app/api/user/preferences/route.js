import { NextResponse } from 'next/server';
import { getCurrentUser, requireAuth } from '@/utils/serverAuth';
// Removed server user preferences - now using Auth0
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
    // Check authentication
    const auth = await requireAuth();
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get preference key from URL params
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Preference key is required' }, { status: 400 });
    }
    
    // Convert simple key to Cognito attribute format (if needed)
    const prefKey = key.startsWith('custom:') ? key : `custom:${key}`;
    
    // Get preference from Cognito
    const value = await getUserPreference(prefKey);
    
    return NextResponse.json({ key: prefKey, value });
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
    // Check authentication
    const auth = await requireAuth();
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { key, value } = body;
    
    if (!key) {
      return NextResponse.json({ error: 'Preference key is required' }, { status: 400 });
    }
    
    // Convert simple key to Cognito attribute format (if needed)
    const prefKey = key.startsWith('custom:') ? key : `custom:${key}`;
    
    // Save preference to Cognito
    const success = await saveUserPreference(prefKey, value || '');
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Preference saved successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 });
    }
  } catch (error) {
    logger.error('[API] Error saving user preference:', error);
    return NextResponse.json({ error: 'Failed to save user preference' }, { status: 500 });
  }
} 
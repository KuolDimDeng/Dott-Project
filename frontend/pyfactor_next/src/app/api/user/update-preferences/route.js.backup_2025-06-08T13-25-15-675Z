import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/serverAuth';
import { saveUserPreferences } from '@/utils/userPreferences.server';
import { logger } from '@/utils/logger';

/**
 * POST handler for batch updating multiple user preferences
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
    const { attributes, clear } = body;
    
    if (!attributes || Object.keys(attributes).length === 0) {
      return NextResponse.json({ error: 'No attributes provided' }, { status: 400 });
    }
    
    // Process attributes to ensure they have the custom: prefix
    const processedAttributes = {};
    Object.entries(attributes).forEach(([key, value]) => {
      const prefKey = key.startsWith('custom:') ? key : `custom:${key}`;
      
      // If clear flag is true, set empty values
      processedAttributes[prefKey] = clear ? '' : (value || '');
    });
    
    // Save preferences to Cognito
    const success = await saveUserPreferences(processedAttributes);
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Preferences updated successfully',
        count: Object.keys(processedAttributes).length
      });
    } else {
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }
  } catch (error) {
    logger.error('[API] Error updating user preferences:', error);
    return NextResponse.json({ error: 'Failed to update user preferences' }, { status: 500 });
  }
} 
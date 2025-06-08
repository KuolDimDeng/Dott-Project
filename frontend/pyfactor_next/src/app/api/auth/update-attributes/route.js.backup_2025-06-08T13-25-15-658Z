import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { resilientUpdateUserAttributes } from '@/utils/amplifyResiliency';

/**
 * API route to update Cognito user attributes
 * 
 * This route:
 * 1. Updates Cognito attributes directly via server-side API
 * 2. Does not set or manage cookies (unlike the deprecated set-cookies route)
 * 3. Used when server-side attribute updates are needed without client-side Amplify
 * 
 * Client usage:
 * - For client-side updates, use updateUserAttributes from aws-amplify/auth directly
 * - Only use this API for server-initiated attribute updates
 */
export async function POST(request) {
  try {
    const { 
      attributes = {},
      idToken
    } = await request.json();
    
    if (!idToken) {
      logger.error('[API] Missing required token for attribute update');
      return NextResponse.json(
        { error: 'Missing required token' },
        { status: 400 }
      );
    }
    
    if (Object.keys(attributes).length === 0) {
      logger.error('[API] No attributes provided for update');
      return NextResponse.json(
        { error: 'No attributes provided for update' },
        { status: 400 }
      );
    }

    logger.debug('[API] Processing attribute update request', {
      attributeCount: Object.keys(attributes).length,
      attributeKeys: Object.keys(attributes)
    });
    
    try {
      // Add timestamp for tracking
      const userAttributes = {
        ...attributes,
        'custom:updated_at': new Date().toISOString()
      };
      
      // Update user attributes using resilient implementation
      await resilientUpdateUserAttributes({ userAttributes });
      
      logger.info('[API] Successfully updated Cognito attributes:', {
        attributes: Object.keys(userAttributes)
      });
      
      return NextResponse.json({ 
        success: true,
        updated: Object.keys(userAttributes),
        message: 'Cognito attributes updated successfully'
      });
      
    } catch (cognitoError) {
      logger.error('[API] Failed to update Cognito attributes:', cognitoError);
      return NextResponse.json({ 
        error: 'Failed to update Cognito attributes', 
        message: 'Authentication state update failed. Please try again.',
        details: cognitoError.message
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('[API] Error updating auth attributes:', error);
    return NextResponse.json(
      { error: 'Error updating auth attributes', message: error.message },
      { status: 500 }
    );
  }
} 
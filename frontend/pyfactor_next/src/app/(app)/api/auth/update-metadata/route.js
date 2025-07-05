import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { logger } from '@/utils/logger';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
const AUTH0_MANAGEMENT_CLIENT_ID = process.env.AUTH0_MANAGEMENT_CLIENT_ID || process.env.AUTH0_CLIENT_ID;
const AUTH0_MANAGEMENT_CLIENT_SECRET = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET || process.env.AUTH0_CLIENT_SECRET;

/**
 * Get Auth0 Management API access token
 */
async function getManagementToken() {
  try {
    const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: AUTH0_MANAGEMENT_CLIENT_ID,
        client_secret: AUTH0_MANAGEMENT_CLIENT_SECRET,
        audience: `https://${AUTH0_DOMAIN}/api/v2/`
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get management token: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    logger.error('[Update Metadata] Error getting management token:', error);
    throw error;
  }
}

/**
 * Update user metadata in Auth0
 */
async function updateAuth0UserMetadata(userId, metadata) {
  try {
    const managementToken = await getManagementToken();
    
    const response = await fetch(`https://${AUTH0_DOMAIN}/api/v2/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${managementToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_metadata: metadata
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update Auth0 user metadata: ${response.status} - ${error}`);
    }

    const updatedUser = await response.json();
    logger.info('[Update Metadata] Successfully updated Auth0 user metadata:', {
      userId,
      metadata: Object.keys(metadata)
    });
    
    return updatedUser;
  } catch (error) {
    logger.error('[Update Metadata] Error updating Auth0 user metadata:', error);
    throw error;
  }
}

export async function POST(request) {
  try {
    // Get current session
    const session = await getSession(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { metadata } = body;

    if (!metadata || typeof metadata !== 'object') {
      return NextResponse.json(
        { error: 'Invalid metadata' },
        { status: 400 }
      );
    }

    const userId = session.user.sub;
    
    logger.info('[Update Metadata] Updating metadata for user:', {
      userId,
      email: session.user.email,
      metadataKeys: Object.keys(metadata)
    });

    try {
      // Check if we have the necessary credentials
      if (!AUTH0_MANAGEMENT_CLIENT_ID || !AUTH0_MANAGEMENT_CLIENT_SECRET) {
        logger.warn('[Update Metadata] Management API credentials not configured');
        return NextResponse.json({ 
          success: false,
          message: 'Management API not configured',
          warning: 'User metadata update requires Auth0 Management API configuration'
        });
      }
      
      const updatedUser = await updateAuth0UserMetadata(userId, metadata);
      
      return NextResponse.json({ 
        success: true,
        message: 'User metadata updated successfully',
        user: {
          id: updatedUser.user_id,
          email: updatedUser.email,
          metadata: updatedUser.user_metadata
        }
      });
      
    } catch (error) {
      logger.error('[Update Metadata] Failed to update user metadata:', error);
      return NextResponse.json(
        { error: 'Failed to update user metadata', message: error.message },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('[Update Metadata] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
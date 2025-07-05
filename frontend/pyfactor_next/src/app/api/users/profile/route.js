/**
 * API Endpoint: /api/users/profile
 * 
 * Provides access to the current user's profile data
 * This serves as a fallback when the tenant-based user lookup fails
 */

import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getSession } from '@/utils/auth/server';

/**
 * Get current user profile
 * 
 * @param {Request} request - The request object
 * @returns {Promise<NextResponse>} The response containing user profile or error
 */
export async function GET(request) {
  try {
    // Get the user session from the request
    const session = await getSession(request);
    
    if (!session || !session.user) {
      logger.warn('[API:users/profile] No authenticated user found');
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    // Extract relevant user data
    const { idToken, accessToken, user } = session;
    
    // Extract attributes from user object
    const { attributes = {} } = user;
    
    // Extract email username part for fallback name
    let emailUsername = '';
    if (attributes.email && attributes.email.includes('@')) {
      emailUsername = attributes.email.split('@')[0];
      // Capitalize the first letter
      emailUsername = emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
    }
    
    // Construct a profile response with important user information
    const profile = {
      id: user.sub || user.username,
      email: attributes.email || user.email || '',
      firstName: attributes.given_name || attributes['custom:firstname'] || emailUsername || 'User',
      lastName: attributes.family_name || attributes['custom:lastname'] || '',
      fullName: `${attributes.given_name || attributes['custom:firstname'] || emailUsername || 'User'} ${attributes.family_name || attributes['custom:lastname'] || ''}`.trim(),
      role: attributes['custom:userrole'] || 'user',
      tenantId: attributes['custom:tenant_ID'] || attributes['custom:businessid'] || '',
      businessName: attributes['custom:businessname'] || attributes['custom:tenant_name'] || '',
      isAuthenticated: true,
      lastLogin: new Date().toISOString(),
      // Don't include tokens in the response for security
      hasValidTokens: !!idToken && !!accessToken
    };
    
    logger.info(`[API:users/profile] Successfully retrieved profile for user: ${profile.email}`);
    
    return NextResponse.json(profile);
    
  } catch (error) {
    logger.error('[API:users/profile] Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
} 
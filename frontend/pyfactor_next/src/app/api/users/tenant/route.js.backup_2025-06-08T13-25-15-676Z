/**
 * API Endpoint: /api/users/tenant
 * 
 * Provides server-side access to Cognito users filtered by tenant ID
 * Handles proper AWS authentication and tenant isolation
 */

import { NextResponse } from 'next/server';
import { 
  CognitoIdentityProviderClient, 
  ListUsersCommand 
} from "@aws-sdk/client-cognito-identity-provider";
import { logger } from '@/utils/logger';
import CognitoAttributes from '@/utils/CognitoAttributes';

/**
 * Get users by tenant ID
 * 
 * @param {Request} request - The request object
 * @returns {Promise<NextResponse>} The response containing users or error
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get tenant ID from query parameters
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      logger.error('[API:users/tenant] Missing required tenantId parameter');
      return NextResponse.json(
        { error: 'Missing required tenantId parameter' },
        { status: 400 }
      );
    }
    
    logger.info(`[API:users/tenant] Fetching users for tenant ID: ${tenantId}`);
    
    // Get AWS credentials from environment variables
    const region = process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION;
    const userPoolId = process.env.COGNITO_USER_POOL_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    
    if (!region || !userPoolId) {
      logger.error('[API:users/tenant] Missing required AWS configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Create Cognito client with proper credentials
    const client = new CognitoIdentityProviderClient({
      region,
      // AWS credentials are automatically loaded from environment variables 
      // in server-side environment (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    });
    
    // Create the filter string to find users with matching tenant ID
    // Support both custom:tenant_ID and custom:businessid for backward compatibility
    const filterString = `custom:tenant_ID = "${tenantId}" or custom:businessid = "${tenantId}"`;
    
    // Create and execute the ListUsers command
    const command = new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: filterString,
      Limit: 60
    });
    
    const response = await client.send(command);
    
    if (!response.Users) {
      logger.warn(`[API:users/tenant] No users found for tenant ID: ${tenantId}`);
      return NextResponse.json({ users: [] });
    }
    
    // Transform the Cognito user objects to a format suitable for the frontend
    const users = response.Users.map(user => {
      // Extract attributes from Cognito user object
      const attributes = {};
      user.Attributes.forEach(attr => {
        attributes[attr.Name] = attr.Value;
      });
      
      // Extract email username part for fallback name
      let emailUsername = '';
      if (attributes.email && attributes.email.includes('@')) {
        emailUsername = attributes.email.split('@')[0];
        // Capitalize the first letter
        emailUsername = emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
      }
      
      // Format user object for frontend with improved name handling
      return {
        id: user.Username,
        email: attributes.email || 'No email',
        first_name: attributes.given_name || emailUsername || 'User',
        last_name: attributes.family_name || '',
        role: attributes['custom:userrole'] || 'user',
        is_active: user.Enabled,
        date_joined: user.UserCreateDate ? new Date(user.UserCreateDate).toISOString() : null,
        last_login: attributes['custom:lastlogin'] || null,
        tenant_id: attributes['custom:tenant_ID'] || attributes['custom:businessid'] || null
      };
    });
    
    logger.info(`[API:users/tenant] Successfully fetched ${users.length} users for tenant ID: ${tenantId}`);
    
    // Return the users array
    return NextResponse.json({ users });
    
  } catch (error) {
    logger.error('[API:users/tenant] Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 
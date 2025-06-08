import { NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { createDbPool } from '@/lib/db-utils';

// Initialize AWS SDK clients
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

/**
 * Checks if a user exists but is disabled in Cognito
 * @param {string} username - The username or email to check
 */
async function checkIfUserDisabled(username) {
  console.info('[API][COGNITO] Checking if user is disabled in Cognito:', username);
  const userPoolId = process.env.COGNITO_USER_POOL_ID || 
                     process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ||
                     'us-east-1_JPL8vGfb6';
  
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: username
    });
    
    const response = await cognitoClient.send(command);
    console.info('[API][COGNITO] User exists:', username);
    
    // Check if user is disabled
    const isDisabled = response.Enabled === false;
    
    // Look up tenant information if user exists
    let tenantInfo = null;
    if (response.Username) {
      try {
        const pool = await createDbPool();
        const client = await pool.connect();
        
        try {
          // Get the tenant ID for this user
          const result = await client.query(`
            SELECT t.id, t.name, t.is_active, t.deactivated_at, t.is_recoverable
            FROM custom_auth_tenant t
            JOIN custom_auth_user u ON u.tenant_id = t.id
            WHERE u.email = $1 OR u.cognito_sub = $2
          `, [username, response.Username]);
          
          if (result.rows.length > 0) {
            tenantInfo = result.rows[0];
          }
        } finally {
          client.release();
        }
      } catch (dbError) {
        console.error('[API][DB] Error looking up tenant info:', dbError);
      }
    }
    
    return {
      exists: true,
      isDisabled,
      username: response.Username,
      tenantInfo,
      userAttributes: response.UserAttributes?.reduce((acc, attr) => {
        acc[attr.Name] = attr.Value;
        return acc;
      }, {})
    };
  } catch (error) {
    if (error.name === 'UserNotFoundException') {
      console.info('[API][COGNITO] User does not exist:', username);
      return { exists: false, isDisabled: false };
    }
    
    console.error('[API][COGNITO] Error checking user status:', error);
    throw error;
  }
}

/**
 * API Endpoint to check if a user is disabled
 * POST /api/user/check-disabled
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { username, email } = body;
    
    if (!username && !email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing username or email' 
      }, { status: 400 });
    }
    
    // Check with both username and email if both are provided
    let userToCheck = username || email;
    
    const userStatus = await checkIfUserDisabled(userToCheck);
    
    return NextResponse.json({
      success: true,
      ...userStatus
    });
  } catch (error) {
    console.error('[API] Error checking user status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check user status',
      message: error.message
    }, { status: 500 });
  }
} 
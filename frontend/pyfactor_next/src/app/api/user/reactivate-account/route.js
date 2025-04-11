import { NextResponse } from 'next/server';
import { withDatabase } from '@/lib/db-utils';
import { CognitoIdentityProviderClient, AdminEnableUserCommand } from "@aws-sdk/client-cognito-identity-provider";

// Initialize AWS SDK clients
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

/**
 * Enables a disabled user in Cognito
 * @param {string} username - The username to enable
 */
async function enableCognitoUser(username) {
  console.info('[API][COGNITO] Attempting to enable user in Cognito:', username);
  const userPoolId = process.env.COGNITO_USER_POOL_ID || 
                     process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ||
                     'us-east-1_JPL8vGfb6';
  
  try {
    const command = new AdminEnableUserCommand({
      UserPoolId: userPoolId,
      Username: username
    });
    
    const response = await cognitoClient.send(command);
    console.info('[API][COGNITO] Success! User enabled in Cognito:', username);
    return true;
  } catch (error) {
    console.error('[API][COGNITO] Error enabling user in Cognito:', error.message);
    throw error;
  }
}

/**
 * POST handler for account reactivation
 * This will reactivate a previously deactivated account
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { username, tenantId, email } = body;
    
    if (!username && !email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing username or email' 
      }, { status: 400 });
    }
    
    // Enable the user in Cognito
    const userToEnable = username || email;
    const cognitoEnabled = await enableCognitoUser(userToEnable);
    
    // If a tenant ID was provided, also reactivate the tenant
    if (tenantId) {
      return await withDatabase(async (client) => {
        try {
          console.info('[API][DB] Starting transaction to reactivate tenant:', tenantId);
          await client.query('BEGIN');
          
          // Reactivate the tenant
          const updateResult = await client.query(`
            UPDATE custom_auth_tenant 
            SET 
              is_active = true, 
              deactivated_at = NULL
            WHERE id = $1
          `, [tenantId]);
          
          console.info(`[API][DB] Reactivated ${updateResult.rowCount} tenant records`);
          
          // If the update was successful, commit the transaction
          if (updateResult.rowCount > 0) {
            await client.query('COMMIT');
            
            return NextResponse.json({
              success: true,
              message: 'Account reactivated successfully!',
              details: {
                cognitoEnabled,
                tenantReactivated: true
              }
            });
          } else {
            // No tenant was found with this ID
            await client.query('ROLLBACK');
            
            return NextResponse.json({
              success: true,
              message: 'Cognito account enabled, but tenant not found',
              details: {
                cognitoEnabled,
                tenantReactivated: false
              }
            });
          }
        } catch (error) {
          // If there was an error, roll back the transaction
          await client.query('ROLLBACK');
          throw error;
        }
      });
    }
    
    // If no tenant ID was provided, just return success for the Cognito part
    return NextResponse.json({
      success: true,
      message: 'Cognito account enabled successfully',
      details: {
        cognitoEnabled,
        tenantReactivated: false
      }
    });
  } catch (error) {
    console.error('[API] Error reactivating account:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to reactivate account',
      message: error.message
    }, { status: 500 });
  }
} 
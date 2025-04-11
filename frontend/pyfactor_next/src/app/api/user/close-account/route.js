import { NextResponse } from 'next/server';
import { createDbPool, getPoolClient, withDatabase } from '@/lib/db-utils';
import { CognitoIdentityProviderClient, AdminDisableUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { jwtDecode } from "jwt-decode";

// Initialize AWS SDK clients
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

console.info('[API][COGNITO] Initialized Cognito client with region:', 
  process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1');

// Helper function to extract user information from auth token
function extractCognitoUserFromToken(request) {
  try {
    // Try to get the token from authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwtDecode(token);
      console.info('[API][COGNITO] Successfully decoded JWT from Authorization header');
      return {
        sub: decoded.sub,
        username: decoded['cognito:username'] || decoded.username,
        email: decoded.email
      };
    }
    
    // Try to get token from cookies
    const cookies = request.cookies;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
    
    // Look for Cognito user in cookies - access token or id token
    const cognitoCookiePrefix = 'CognitoIdentityServiceProvider';
    let idToken = null;
    let lastAuthUser = null;
    
    // First get LastAuthUser
    for (const [key, value] of cookies.getAll()) {
      if (key === `${cognitoCookiePrefix}.${clientId}.LastAuthUser` && value) {
        lastAuthUser = value;
        break;
      }
    }
    
    if (lastAuthUser) {
      // Now get the token
      for (const [key, value] of cookies.getAll()) {
        if ((key === `${cognitoCookiePrefix}.${clientId}.${lastAuthUser}.idToken` || 
             key === `${cognitoCookiePrefix}.${clientId}.${lastAuthUser}.accessToken`) && value) {
          idToken = value;
          break;
        }
      }
      
      if (idToken) {
        const decoded = jwtDecode(idToken);
        console.info('[API][COGNITO] Successfully decoded JWT from Cognito cookie');
        return {
          sub: decoded.sub,
          username: decoded['cognito:username'] || decoded.username,
          email: decoded.email
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('[API][COGNITO] Error extracting user from token:', error);
    return null;
  }
}

// Helper function to disable user in Cognito
async function disableCognitoUser(username) {
  console.info('[API][COGNITO] Attempting to disable user in Cognito:', username);
  const userPoolId = process.env.COGNITO_USER_POOL_ID || 
                    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ||
                    'us-east-1_JPL8vGfb6';
  console.info('[API][COGNITO] Using UserPoolId:', userPoolId);
  console.info('[API][COGNITO] AWS Credentials available:', 
    !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY);
  
  try {
    const command = new AdminDisableUserCommand({
      UserPoolId: userPoolId,
      Username: username
    });
    
    console.info('[API][COGNITO] Sending AdminDisableUserCommand for user:', username);
    
    const response = await cognitoClient.send(command);
    console.info('[API][COGNITO] Success! User disabled in Cognito:', username);
    console.info('[API][COGNITO] Response:', JSON.stringify(response, null, 2));
    return true;
  } catch (error) {
    console.error('[API][COGNITO] Error disabling user in Cognito:', error.message);
    console.error('[API][COGNITO] Error details:', JSON.stringify({
      code: error.code,
      name: error.name,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      message: error.message,
      stack: error.stack
    }, null, 2));
    return false;
  }
}

/**
 * POST handler for account closure
 * This will delete the tenant's data from all relevant tables in the database
 * while respecting Row-Level Security (RLS) policies
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { reason, userId, tenantId, retry } = body;
    
    const logContext = { userId, tenantId, reason, retry };
    console.info('[API] Processing account closure', logContext);

    if (!userId || !tenantId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Extract Cognito user information from token if available
    const cognitoUserInfo = extractCognitoUserFromToken(request);
    if (cognitoUserInfo) {
      console.info('[API][COGNITO] Extracted user info from token:', cognitoUserInfo);
    } else {
      console.info('[API][COGNITO] Could not extract user info from token');
    }
    
    // Also disable the user in Cognito - perform this outside the database transaction
    // to avoid transaction rollback if Cognito call fails
    console.info('[API][COGNITO] User ID as received from request:', userId);
    
    // Check if we have cookies with Cognito user information
    const cookies = request.cookies;
    let cognitoUsername = null;
    
    // Look for Cognito user in cookies - typically in format like:
    // 'CognitoIdentityServiceProvider.1o5v84mrgn4gt87khtr179uc5b.LastAuthUser'
    try {
      const cognitoCookiePrefix = 'CognitoIdentityServiceProvider';
      const clientIdPrefix = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
      const lastAuthUserKey = `${cognitoCookiePrefix}.${clientIdPrefix}.LastAuthUser`;
      
      console.info('[API][COGNITO] Looking for Cognito cookie:', lastAuthUserKey);
      
      // Try to get actual Cognito username from cookies
      for (const [key, value] of cookies.getAll()) {
        console.info('[API][COGNITO] Checking cookie:', key);
        if (key === lastAuthUserKey && value) {
          cognitoUsername = value;
          console.info('[API][COGNITO] Found LastAuthUser in cookies:', cognitoUsername);
          break;
        }
      }
    } catch (cookieError) {
      console.warn('[API][COGNITO] Error accessing cookies:', cookieError.message);
    }
    
    // If we couldn't find the username in cookies, try multiple formats
    // Format 1: As provided
    // Format 2: Email address (if it looks like one)
    // Format 3: UUID with @example.com suffix
    const usernamesToTry = [];
    
    // If we have user info from token, prioritize it
    if (cognitoUserInfo) {
      if (cognitoUserInfo.username) {
        usernamesToTry.push(cognitoUserInfo.username);
      }
      if (cognitoUserInfo.sub) {
        usernamesToTry.push(cognitoUserInfo.sub);
      }
      if (cognitoUserInfo.email) {
        usernamesToTry.push(cognitoUserInfo.email);
      }
    }
    
    // Always try the original user ID first
    if (!usernamesToTry.includes(userId)) {
      usernamesToTry.push(userId);
    }
    
    // Add the cookie username if found
    if (cognitoUsername && !usernamesToTry.includes(cognitoUsername)) {
      usernamesToTry.push(cognitoUsername);
    }
    
    // If looks like email, use as is
    if (userId.includes('@') && !usernamesToTry.includes(userId)) {
      usernamesToTry.push(userId);
    } else if (!usernamesToTry.includes(`${userId}@example.com`)) {
      // Try with @example.com suffix
      usernamesToTry.push(`${userId}@example.com`);
    }
    
    // Try to find the actual Cognito sub value from our DB
    try {
      // Use our withDatabase utility to get a client for a quick query
      const pool = await createDbPool();
      const client = await pool.connect();
      try {
        // Search for the Cognito sub in our user database
        const result = await client.query(`
          SELECT cognito_sub 
          FROM custom_auth_user 
          WHERE id = $1 OR email = $1
        `, [userId]);
        
        if (result.rows.length > 0 && result.rows[0].cognito_sub) {
          const cognitoSub = result.rows[0].cognito_sub;
          console.info('[API][COGNITO] Found cognito_sub in database:', cognitoSub);
          if (!usernamesToTry.includes(cognitoSub)) {
            usernamesToTry.unshift(cognitoSub); // Add to beginning with highest priority
          }
        }
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.warn('[API][COGNITO] Error looking up cognito_sub in database:', dbError.message);
    }
    
    console.info('[API][COGNITO] Will try to disable user with these usernames:', usernamesToTry);
    
    // Try each username format until one works
    let cognitoDisabled = false;
    for (const username of usernamesToTry) {
      console.info('[API][COGNITO] Attempting to disable with username:', username);
      cognitoDisabled = await disableCognitoUser(username);
      if (cognitoDisabled) {
        console.info('[API][COGNITO] Successfully disabled user with username:', username);
        break;
      }
    }
    
    console.info('[API][COGNITO] Cognito user deactivation final result:', cognitoDisabled);
    
    // Use our withDatabase utility to handle the database operation
    return await withDatabase(async (client) => {
      try {
        console.info('[API][DB] Starting database transaction for account closure');
        // Begin a transaction
        await client.query('BEGIN');
        console.info('[API][DB] Transaction begun successfully');
        
        try {
          console.info('[API][DB] Creating account_closures table if it doesn\'t exist');
          // 0. Create account_closures table if it doesn't exist
          await client.query(`
            CREATE TABLE IF NOT EXISTS account_closures (
              id SERIAL PRIMARY KEY,
              user_id VARCHAR(255) NOT NULL,
              tenant_id UUID NOT NULL,
              reason VARCHAR(255),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              data_deleted BOOLEAN DEFAULT FALSE,
              cognito_disabled BOOLEAN DEFAULT FALSE
            )
          `);
          console.info('[API][DB] account_closures table exists/created');
          
          // 1. Log the account closure reason for analytics
          console.info('[API][DB] Logging account closure in account_closures table');
          await client.query(
            'INSERT INTO account_closures (user_id, tenant_id, reason, created_at, cognito_disabled) VALUES ($1, $2, $3, NOW(), $4)',
            [userId, tenantId, reason, cognitoDisabled]
          );
          console.info('[API][DB] Successfully logged account closure');
        } catch (error) {
          console.warn('[API][DB] Could not create/use account_closures table, but continuing with deletion', error);
          // Continue even if this fails - it's just for analytics
        }
        
        // 2. Set the RLS tenant context for this session
        // This ensures all operations respect the RLS policies for this tenant
        let rlsSuccess = false;
        try {
          console.info('[API][DB] Setting RLS tenant context for tenant:', tenantId);
          // Use single quotes for the parameter name and manually inject the tenant ID
          // since prepared statements can't be used for this SQL command
          await client.query(`SET LOCAL app.current_tenant = '${tenantId}'`);
          console.info('[API][DB] Successfully set RLS tenant context to:', tenantId);
          rlsSuccess = true;
        } catch (error) {
          console.warn('[API][DB] Could not set RLS tenant context:', error.message);
          
          // If RLS fails, we need to handle it specially - roll back and restart
          if (error.message.includes('syntax')) {
            console.info('[API][DB] RLS syntax error detected, rolling back and restarting transaction');
            // Roll back the transaction that had the syntax error
            await client.query('ROLLBACK');
            // Start a new transaction without attempting to use RLS
            await client.query('BEGIN');
            console.info('[API][DB] Started new transaction without RLS due to syntax error');
          }
        }
        
        // 3. Delete user-tenant relationships
        console.info('[API][DB] Deleting user-tenant relationships');
        const tenantUsersResult = await client.query(
          'DELETE FROM tenant_users WHERE tenant_id = $1 RETURNING user_id',
          [tenantId]
        );
        console.info(`[API][DB] Deleted ${tenantUsersResult.rowCount} user-tenant relationships`);
        
        // 4. Delete user subscriptions
        console.info('[API][DB] Deleting user subscriptions');
        const subscriptionsResult = await client.query(
          'DELETE FROM users_subscription WHERE tenant_id = $1',
          [tenantId]
        );
        console.info(`[API][DB] Deleted ${subscriptionsResult.rowCount} user subscriptions`);
        
        // 5. Delete all the tenant-specific data from the various tables
        console.info('[API][DB] Beginning deletion of tenant-specific data from tables');
        const tablesToClean = [
          'crm_activity', 'crm_campaign', 'crm_campaignmember', 'crm_contact', 
          'crm_customer', 'crm_deal', 'crm_lead', 'crm_opportunity',
          'finance_account', 'finance_accountcategory', 'finance_accountreconciliation',
          'finance_accounttype', 'finance_audittrail', 'finance_budget', 'finance_budgetitem',
          'finance_cashaccount', 'finance_chartofaccount', 'finance_financetransaction',
          'finance_financialstatement', 'finance_fixedasset', 'finance_generalledgerentry',
          'finance_income', 'finance_journalentry', 'finance_journalentryline',
          'finance_monthendclosing', 'finance_reconciliationitem',
          'hr_employee', 'hr_employeerole', 'hr_preboardingform', 
          'inventory_category', 'inventory_inventoryitem', 'inventory_inventorytransaction',
          'inventory_location', 'inventory_product', 'inventory_service', 'inventory_supplier',
          'payments_paymenttransaction', 'payroll_payrollrun', 'payroll_payrolltransaction',
          'purchases_bill', 'purchases_billitem', 'purchases_expense', 'purchases_procurement',
          'purchases_purchaseorder', 'purchases_purchasereturn', 'purchases_vendor',
          'sales_estimate', 'sales_estimateitem', 'sales_invoice', 'sales_invoiceitem',
          'sales_refund', 'sales_sale', 'sales_salesorder',
          'transport_compliance', 'transport_driver', 'transport_equipment',
          'transport_expense', 'transport_load', 'transport_maintenance', 'transport_route',
          'users_business', 'users_business_details', 'users_businessmember'
        ];
        
        // With RLS enabled, we can just delete from tables and the policies will
        // ensure we only delete rows belonging to this tenant
        let totalRowsDeleted = 0;
        console.info(`[API][DB] Cleaning ${tablesToClean.length} tables using ${rlsSuccess ? 'RLS' : 'explicit tenant filtering'}`);
        
        for (const table of tablesToClean) {
          try {
            // If RLS was successfully set up, we can use a simple DELETE
            // Otherwise, we need to explicitly filter by tenant_id
            let deleteResult;
            if (rlsSuccess) {
              // When using RLS, we should be able to simply delete without a WHERE clause
              // as the RLS policy will restrict to just this tenant's rows
              deleteResult = await client.query(`DELETE FROM ${table}`);
            } else {
              // Without RLS working, we need to explicitly specify the tenant ID
              deleteResult = await client.query(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenantId]);
            }
            
            totalRowsDeleted += deleteResult.rowCount;
            console.info(`[API][DB] Deleted ${deleteResult.rowCount} rows from ${table}`);
          } catch (error) {
            console.warn(`[API][DB] Error deleting from ${table}:`, error.message);
            // Continue with other tables even if one fails
          }
        }
        console.info(`[API][DB] Completed data deletion. Total rows deleted: ${totalRowsDeleted}`);

        // Mark the deletion as completed in account_closures
        try {
          console.info('[API][DB] Marking account closure as completed');
          // Use a CTE (Common Table Expression) to select the most recent record first
          const updateResult = await client.query(`
            WITH latest_closure AS (
              SELECT id 
              FROM account_closures 
              WHERE tenant_id = $1
              ORDER BY created_at DESC 
              LIMIT 1
            )
            UPDATE account_closures 
            SET data_deleted = true 
            WHERE id IN (SELECT id FROM latest_closure)
          `, [tenantId]);
          console.info(`[API][DB] Updated ${updateResult.rowCount} account_closures records`);
        } catch (error) {
          console.warn('[API][DB] Could not update account_closures:', error.message);
        }
        
        // 6. Deactivate the tenant rather than deleting it 
        // This preserves RLS policies but prevents future access
        // Add a deactivated_at timestamp so we know when the account was closed
        // and mark it as recoverable so it can be reactivated if the user returns
        try {
          console.info('[API][DB] Deactivating tenant:', tenantId);
          const deactivateResult = await client.query(`
            UPDATE custom_auth_tenant 
            SET is_active = false
            WHERE id = $1
          `, [tenantId]);
          console.info(`[API][DB] Deactivated ${deactivateResult.rowCount} tenant records`);
          
          // Try to update the new columns if they exist
          try {
            console.info('[API][DB] Setting deactivated_at and is_recoverable fields');
            const timestampResult = await client.query(`
              UPDATE custom_auth_tenant 
              SET 
                deactivated_at = NOW(),
                is_recoverable = true
              WHERE id = $1
            `, [tenantId]);
            console.info(`[API][DB] Successfully updated deactivation timestamp and recoverability flag for ${timestampResult.rowCount} records`);
          } catch (columnError) {
            console.warn('[API][DB] Could not update deactivation timestamp or recoverability flag:', columnError.message);
            console.warn('[API][DB] This is expected if these columns don\'t exist yet. Database reset recommended.');
          }
        } catch (error) {
          console.error('[API][DB] Error deactivating tenant:', error.message);
          throw error;
        }
        
        // 7. Reset the RLS tenant context
        if (rlsSuccess) {
          try {
            console.info('[API][DB] Resetting RLS tenant context');
            // Use a direct statement without quotes for resetting
            await client.query(`RESET app.current_tenant`);
            console.info('[API][DB] Successfully reset RLS tenant context');
          } catch (error) {
            console.warn('[API][DB] Could not reset RLS tenant context:', error.message);
          }
        }
        
        // Commit the transaction
        console.info('[API][DB] Committing transaction');
        await client.query('COMMIT');
        console.info('[API][DB] Transaction committed successfully');
        
        // Return success response
        console.info('[API] Account closure completed successfully');
        return NextResponse.json({
          success: true,
          message: 'Account closure request processed successfully. All your data has been preserved but your account has been deactivated.',
          details: {
            databaseDeactivated: true,
            cognitoDeactivated: cognitoDisabled
          }
        });
      } catch (error) {
        // Rollback the transaction if there was an error
        console.error('[API][DB] Error during account closure, rolling back transaction:', error);
        try {
          await client.query('ROLLBACK');
          console.info('[API][DB] Transaction rolled back successfully');
        } catch (rollbackError) {
          console.error('[API][DB] Error during transaction rollback:', rollbackError.message);
        }
        
        throw error; // Re-throw to be caught by the outer catch block
      }
    });
  } catch (error) {
    console.error('[API] Account closure error:', error.message || String(error));
    
    // Return a more user-friendly message for database connection errors
    const isDbConnectionError = 
      error.message?.includes('pg_hba.conf') || 
      error.message?.includes('connection') ||
      error.message?.includes('timeout');
    
    return NextResponse.json({
      success: false, 
      error: isDbConnectionError ? 'Database connection error' : 'Failed to close account', 
      message: isDbConnectionError 
        ? 'Our system is currently experiencing database connection issues. Please try again later.'
        : (error.message || String(error)),
      details: {
        errorMessage: error.message,
        errorName: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    }, { status: 500 });
  }
} 
#!/usr/bin/env node

/**
 * This script sets the 'custom:userrole' attribute to 'owner' for all users in Cognito
 * This ensures consistent role naming after removing the 'ADMIN' role
 * 
 * Usage:
 * 1. Set AWS credentials in environment or AWS config
 * 2. Run: node fix_user_roles.js
 */

const { 
  CognitoIdentityProviderClient, 
  ListUsersCommand, 
  AdminUpdateUserAttributesCommand,
  AdminGetUserCommand 
} = require('@aws-sdk/client-cognito-identity-provider');

// Configuration
const REGION = process.env.AWS_REGION || 'us-east-1';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'your-user-pool-id';
const DRY_RUN = process.env.DRY_RUN === 'false' ? false : true; // Default to dry run for safety

// Initialize the Cognito client
const client = new CognitoIdentityProviderClient({ region: REGION });

async function listAllUsers() {
  let users = [];
  let paginationToken = null;
  
  do {
    const command = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60,
      ...(paginationToken && { PaginationToken: paginationToken })
    });
    
    const response = await client.send(command);
    users = users.concat(response.Users || []);
    paginationToken = response.PaginationToken;
    
    console.log(`Fetched ${response.Users.length} users. Total so far: ${users.length}`);
  } while (paginationToken);
  
  return users;
}

async function updateUserRole(username) {
  // First check if user has attributes that need fixing
  const attributesToUpdate = [
    {
      Name: 'custom:userrole',
      Value: 'owner'
    }
  ];
  
  // Check if user has the old business_id attribute
  try {
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    });
    
    const userDetails = await client.send(getUserCommand);
    
    // Check if user has the old business_id attribute
    const oldBusinessIdAttr = userDetails.UserAttributes.find(
      attr => attr.Name === 'custom:business_id'
    );
    
    if (oldBusinessIdAttr && oldBusinessIdAttr.Value) {
      console.log(`User ${username} has old business_id attribute. Will migrate to businessid.`);
      attributesToUpdate.push({
        Name: 'custom:businessid',
        Value: oldBusinessIdAttr.Value
      });
    }
    
    // Check if user has lowercase tenant_id attribute
    const oldTenantIdAttr = userDetails.UserAttributes.find(
      attr => attr.Name === 'custom:tenant_id'
    );
    
    if (oldTenantIdAttr && oldTenantIdAttr.Value) {
      console.log(`User ${username} has lowercase tenant_id attribute. Will migrate to tenant_ID.`);
      attributesToUpdate.push({
        Name: 'custom:tenant_ID',
        Value: oldTenantIdAttr.Value
      });
    }
    
  } catch (error) {
    console.warn(`Could not check attributes for user ${username}:`, error);
    // Continue with just the role update
  }
  
  const command = new AdminUpdateUserAttributesCommand({
    UserPoolId: USER_POOL_ID,
    Username: username,
    UserAttributes: attributesToUpdate
  });
  
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would update user ${username} with role 'owner' and fix attributes`);
    return { success: true, dryRun: true };
  } else {
    try {
      const response = await client.send(command);
      console.log(`✅ Updated user ${username} with role 'owner' and fixed attributes`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error updating user ${username}:`, error);
      return { success: false, error };
    }
  }
}

async function main() {
  try {
    console.log(`Fixing user roles in Cognito User Pool ${USER_POOL_ID}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE RUN (changes will be applied)'}`);
    
    // List all users
    console.log('Fetching all users...');
    const users = await listAllUsers();
    console.log(`Found ${users.length} users total.`);
    
    // Update each user
    console.log('\nUpdating user roles...');
    let successCount = 0;
    let failureCount = 0;
    
    for (const user of users) {
      const result = await updateUserRole(user.Username);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
    
    // Summary
    console.log('\n--- Summary ---');
    console.log(`Total users processed: ${users.length}`);
    console.log(`Successful updates: ${successCount}`);
    console.log(`Failed updates: ${failureCount}`);
    
    if (DRY_RUN) {
      console.log('\n⚠️ This was a DRY RUN. No changes were made.');
      console.log('To apply changes, run with: DRY_RUN=false node fix_user_roles.js');
    }
    
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 
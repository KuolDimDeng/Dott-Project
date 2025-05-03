/**
 * @fileoverview
 * Script to add tenant ID to existing users for proper user isolation
 * Version: 1.0.0
 * 
 * This script:
 * 1. Updates existing users to add tenantId attribute for tenant isolation
 * 2. Creates a report of updated users
 */

import fs from 'fs';
import path from 'path';
import { CognitoIdentityProviderClient, ListUsersCommand, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { createBackup } from './utils/createBackup.js';

// Simple logger for this script
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`)
};

// Initialize AWS SDK client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Cognito User Pool ID
const userPoolId = process.env.COGNITO_USER_POOL_ID || 
                   process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ||
                   'us-east-1_JPL8vGfb6';

/**
 * List all users from Cognito
 * @returns {Promise<Array>} - List of users
 */
async function listAllUsers() {
  try {
    logger.info('[TenantIsolation] Listing all users from Cognito...');
    
    const params = {
      UserPoolId: userPoolId,
      Limit: 60
    };
    
    let allUsers = [];
    let paginationToken = null;
    
    do {
      if (paginationToken) {
        params.PaginationToken = paginationToken;
      }
      
      const command = new ListUsersCommand(params);
      const response = await cognitoClient.send(command);
      
      const users = (response.Users || []).map(user => {
        const attributes = {};
        
        // Convert user attributes from array to object format
        if (user.Attributes) {
          user.Attributes.forEach(attr => {
            attributes[attr.Name] = attr.Value;
          });
        }
        
        return {
          id: user.Username,
          username: user.Username,
          status: user.UserStatus,
          email: attributes.email || '',
          firstName: attributes['given_name'] || attributes['custom:firstname'] || '',
          lastName: attributes['family_name'] || attributes['custom:lastname'] || '',
          role: attributes['custom:userrole'] || 'User',
          createdAt: user.UserCreateDate,
          tenantId: attributes['custom:tenantId'] || null,
          businessName: attributes['custom:businessname'] || '',
          rawAttributes: user.Attributes || []
        };
      });
      
      allUsers = [...allUsers, ...users];
      paginationToken = response.PaginationToken;
      
      logger.info(`[TenantIsolation] Retrieved ${users.length} users (total: ${allUsers.length})`);
    } while (paginationToken);
    
    return allUsers;
  } catch (error) {
    logger.error('[TenantIsolation] Error listing users:', error);
    throw error;
  }
}

/**
 * Group users by business name or email domain
 * @param {Array} users - List of users
 * @returns {Object} - Grouped users by business
 */
function groupUsersByBusiness(users) {
  const businessGroups = {};
  const unmappedUsers = [];
  
  // First, try to group by existing business name
  users.forEach(user => {
    if (user.businessName) {
      const businessKey = user.businessName.toLowerCase().trim();
      if (!businessGroups[businessKey]) {
        businessGroups[businessKey] = {
          businessName: user.businessName,
          tenantId: generateTenantId(user.businessName),
          users: []
        };
      }
      businessGroups[businessKey].users.push(user);
    } else {
      unmappedUsers.push(user);
    }
  });
  
  // Next, try to group remaining users by email domain
  const domainGroups = {};
  unmappedUsers.forEach(user => {
    if (user.email && user.email.includes('@')) {
      const domain = user.email.split('@')[1].toLowerCase();
      if (!domainGroups[domain]) {
        domainGroups[domain] = {
          domain,
          tenantId: generateTenantId(domain),
          users: []
        };
      }
      domainGroups[domain].users.push(user);
    }
  });
  
  // Merge domain groups into business groups
  Object.values(domainGroups).forEach(group => {
    businessGroups[`domain_${group.domain}`] = {
      businessName: `Domain: ${group.domain}`,
      tenantId: group.tenantId,
      users: group.users
    };
  });
  
  return businessGroups;
}

/**
 * Generate a tenant ID from a business name or domain
 * @param {string} source - Source string to generate ID from
 * @returns {string} - Generated tenant ID
 */
function generateTenantId(source) {
  // Generate a deterministic UUID-like ID based on the source
  // In a real implementation, you would use a more sophisticated method
  const hash = Array.from(source)
    .reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)
    .toString(16);
  
  // Create a UUID-like string
  const uuid = [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16), // Version 4 UUID
    '8' + hash.substring(17, 20), // Variant 1 UUID
    hash.substring(20, 32)
  ].join('-');
  
  return uuid;
}

/**
 * Update user attributes in Cognito
 * @param {string} username - User's username
 * @param {Array} attributes - Attributes to update
 * @returns {Promise<Object>} - Update result
 */
async function updateUserAttributes(username, attributes) {
  try {
    const params = {
      UserPoolId: userPoolId,
      Username: username,
      UserAttributes: attributes
    };
    
    const command = new AdminUpdateUserAttributesCommand(params);
    const response = await cognitoClient.send(command);
    
    return response;
  } catch (error) {
    logger.error(`[TenantIsolation] Error updating user ${username}:`, error);
    throw error;
  }
}

/**
 * Update tenant IDs for all users
 * @param {Object} businessGroups - Grouped users by business
 * @returns {Promise<Array>} - Results of updates
 */
async function updateTenantIds(businessGroups) {
  const results = {
    updated: [],
    failed: [],
    skipped: []
  };
  
  for (const business of Object.values(businessGroups)) {
    logger.info(`[TenantIsolation] Processing business: ${business.businessName} (${business.users.length} users)`);
    
    for (const user of business.users) {
      try {
        // Skip users that already have a tenant ID
        if (user.tenantId) {
          logger.info(`[TenantIsolation] Skipping user ${user.email} - already has tenant ID: ${user.tenantId}`);
          results.skipped.push({
            email: user.email,
            username: user.username,
            tenantId: user.tenantId,
            reason: 'Already has tenant ID'
          });
          continue;
        }
        
        // Update the user with the business tenant ID
        const attributes = [{
          Name: 'custom:tenantId',
          Value: business.tenantId
        }];
        
        await updateUserAttributes(user.username, attributes);
        
        results.updated.push({
          email: user.email,
          username: user.username,
          tenantId: business.tenantId,
          businessName: business.businessName
        });
        
        logger.info(`[TenantIsolation] Updated user ${user.email} with tenant ID: ${business.tenantId}`);
      } catch (error) {
        logger.error(`[TenantIsolation] Failed to update user ${user.email}:`, error.message);
        
        results.failed.push({
          email: user.email,
          username: user.username,
          error: error.message
        });
      }
    }
  }
  
  return results;
}

/**
 * Generate a report of updated users
 * @param {Object} results - Update results
 * @returns {string} - Path to the report file
 */
function generateReport(results) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const reportDir = path.resolve(process.cwd(), 'scripts', 'reports');
  
  // Create reports directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, `tenant_isolation_report_${timestamp}.json`);
  
  const report = {
    timestamp,
    summary: {
      updated: results.updated.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      total: results.updated.length + results.failed.length + results.skipped.length
    },
    updated: results.updated,
    failed: results.failed,
    skipped: results.skipped
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  return reportPath;
}

// Main execution
(async () => {
  logger.info('[TenantIsolation] Starting tenant isolation script...');
  
  try {
    // List all users
    const users = await listAllUsers();
    logger.info(`[TenantIsolation] Retrieved ${users.length} users total`);
    
    if (users.length === 0) {
      logger.info('[TenantIsolation] No users found. Exiting.');
      return;
    }
    
    // Group users by business
    const businessGroups = groupUsersByBusiness(users);
    logger.info(`[TenantIsolation] Grouped users into ${Object.keys(businessGroups).length} businesses`);
    
    // Update tenant IDs
    const results = await updateTenantIds(businessGroups);
    
    // Generate report
    const reportPath = generateReport(results);
    
    logger.info(`[TenantIsolation] Tenant isolation complete. Report saved to: ${reportPath}`);
    console.log('\n✅ Successfully updated tenant IDs for user isolation\n');
    console.log(`Summary:
- Updated: ${results.updated.length} users
- Failed: ${results.failed.length} users
- Skipped: ${results.skipped.length} users (already had tenant ID)
- Total: ${results.updated.length + results.failed.length + results.skipped.length} users`);
    console.log(`\nDetailed report saved to: ${reportPath}`);
  } catch (error) {
    logger.error('[TenantIsolation] Error during tenant isolation:', error);
    console.error('\n❌ Failed to update tenant IDs. See logs for details.\n');
  }
})(); 
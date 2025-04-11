/**
 * Tenant Utilities
 * 
 * This file provides utilities for working with tenant IDs in a
 * consistent and secure manner. It implements deterministic UUID
 * generation to ensure users always get the same tenant ID.
 */

const { v5: uuidv5 } = require('uuid');

// Namespace for tenant IDs (this should be consistent across the application)
// Using a UUID v4 as namespace for tenant generation
const TENANT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Generate a deterministic tenant ID from a Cognito user ID
 * Always returns the same UUID for the same user ID
 * 
 * @param {string} userId - Cognito user ID (sub)
 * @returns {string} Deterministic UUID v5
 */
function generateDeterministicTenantId(userId) {
  if (!userId) {
    console.error('Cannot generate tenant ID: No user ID provided');
    return null;
  }
  
  try {
    // Use UUID v5 to generate a deterministic UUID from the user ID
    // This guarantees the same tenant ID will always be generated for a given user
    return uuidv5(userId, TENANT_NAMESPACE);
  } catch (error) {
    console.error('Error generating deterministic tenant ID:', error);
    return null;
  }
}

/**
 * Format the schema name from a tenant ID
 * Convert UUID format to a valid PostgreSQL schema name
 * 
 * @param {string} tenantId - UUID format tenant ID
 * @returns {string} Schema name in format tenant_xxxx_xxxx_xxxx_xxxx_xxxxxxxxxxxx
 */
function formatSchemaName(tenantId) {
  if (!tenantId) return null;
  
  // Replace dashes with underscores for a valid PostgreSQL schema name
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

/**
 * Validate tenant ID format
 * Checks if the ID is a valid UUID
 * 
 * @param {string} tenantId - Tenant ID to validate
 * @returns {boolean} True if valid UUID format
 */
function isValidTenantId(tenantId) {
  if (!tenantId) return false;
  
  // Check if it's a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tenantId);
}

module.exports = {
  generateDeterministicTenantId,
  formatSchemaName,
  isValidTenantId,
  TENANT_NAMESPACE
}; 
/**
 * Tenant ID and schema naming utilities
 * Handles consistent tenant ID generation and schema naming for the RLS-based system
 */

import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

// Constants
const UUID_NAMESPACE = '9f452fc7-a9c3-4850-8b62-bc2fa3efa73d'; // Fixed namespace for deterministic IDs
const SCHEMA_PREFIX = 'tenant_';

/**
 * Format a tenant ID into a valid PostgreSQL schema name
 * @param {string} tenantId - UUID or business ID
 * @returns {string} Valid schema name
 */
export function formatSchemaName(tenantId) {
  if (!tenantId) return null;
  
  // Remove hyphens and convert to lowercase
  const cleanId = tenantId.replace(/-/g, '').toLowerCase();
  
  // Use only the first 20 chars to keep the name reasonable length
  const truncatedId = cleanId.substring(0, 20);
  
  // Add prefix and ensure it starts with a letter
  return `${SCHEMA_PREFIX}${truncatedId}`;
}

/**
 * Generate a deterministic tenant ID from a user ID
 * This ensures the same user always gets the same tenant ID
 * @param {string} userId - User ID to use as the seed
 * @returns {string} Deterministic UUID
 */
export function generateDeterministicTenantId(userId) {
  if (!userId) return null;
  
  // Generate a deterministic UUID based on the user ID
  return uuidv5(userId, UUID_NAMESPACE);
}

/**
 * Check if a string is a valid UUID
 * @param {string} id - String to check
 * @returns {boolean} True if valid UUID
 */
export function isValidUUID(id) {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Generate a new random UUID for a tenant
 * @returns {string} New UUID
 */
export function generateNewTenantId() {
  return uuidv4();
}

/**
 * Ensure a tenant ID is a valid UUID
 * If it's not, convert it to a deterministic UUID
 * @param {string} tenantId - Tenant ID to validate
 * @returns {string} Valid UUID tenant ID
 */
export function ensureValidTenantId(tenantId) {
  if (!tenantId) return null;
  
  if (isValidUUID(tenantId)) {
    return tenantId;
  }
  
  // Convert non-UUID to deterministic UUID using the input as seed
  return uuidv5(tenantId, UUID_NAMESPACE);
}

/**
 * Set tenant context to bypass RLS in SQL
 * @param {string} tenantId - Tenant ID to set
 * @returns {string} SQL statement to set tenant context
 */
export function getTenantContextSql(tenantId) {
  if (!tenantId) {
    return "SELECT set_config('app.current_tenant_id', 'unset', false)";
  }
  return `SELECT set_config('app.current_tenant_id', '${tenantId}', false)`;
}

/**
 * Clear tenant context in SQL
 * @returns {string} SQL statement to clear tenant context
 */
export function getClearTenantContextSql() {
  return "SELECT set_config('app.current_tenant_id', 'unset', false)";
}

/**
 * Check if RLS is properly configured in the database
 * @param {object} client - Database client
 * @returns {Promise<object>} Test results
 */
export async function testRlsConfiguration(client) {
  try {
    // Try to bypass RLS intentionally
    await client.query("SELECT set_config('app.current_tenant_id', 'unset', false)");
    
    // Count rows in test table without tenant filter
    const result = await client.query("SELECT COUNT(*) FROM public.test_rls_table");
    const totalRows = parseInt(result.rows[0].count);
    
    // Set tenant context to specific tenant
    await client.query("SELECT set_config('app.current_tenant_id', 'tenant1', false)");
    
    // Count rows with tenant filter
    const filterResult = await client.query("SELECT COUNT(*) FROM public.test_rls_table");
    const filteredRows = parseInt(filterResult.rows[0].count);
    
    // Clear tenant context
    await client.query("SELECT set_config('app.current_tenant_id', 'unset', false)");
    
    return {
      success: true,
      rlsWorking: filteredRows < totalRows,
      totalRows,
      filteredRows,
      message: filteredRows < totalRows ? 
        'RLS working correctly' : 
        'RLS may not be properly configured - tenant filter not limiting data'
    };
  } catch (error) {
    return {
      success: false,
      rlsWorking: false,
      error: error.message
    };
  }
} 
'use client';

import { usePathname, useParams, useSearchParams } from 'next/navigation';
import { logger } from './logger';
import { updateUserAttributes, fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth';
import { setCacheValue, getCacheValue, removeCacheValue } from '@/utils/appCache';
import { saveUserPreference, PREF_KEYS } from '@/utils/userPreferences';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { resilientUpdateUserAttributes, resilientFetchUserAttributes } from '@/utils/amplifyResiliency';

/**
 * Custom hook to get the tenant ID from various sources
 * @returns {Promise<string|null>} The tenant ID or null if not found
 */
export function useTenantId() {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  
  // First check route parameters from dynamic routes
  let tenantId = params?.tenantId || null;
  
  // If not in route params, try to extract from pathname
  if (!tenantId && pathname) {
    const match = pathname.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/|$)/i);
    if (match) {
      tenantId = match[1];
    }
  }
  
  // If still not found, check query parameters
  if (!tenantId) {
    tenantId = searchParams?.get('tenantId') || null;
  }
  
  // We'll check Cognito in a separate effect since it's async
  return tenantId;
}

/**
 * Gets the tenant ID for server components from headers
 * @param {Object} headers - Request headers
 * @returns {string|null} The tenant ID or null if not found
 */
export function getServerTenantId(headers) {
  // Check the headers (set by middleware)
  if (headers && headers.get('x-tenant-id')) {
    return headers.get('x-tenant-id');
  }
  
  return null;
}

/**
 * Tenant utility functions
 * These utilities handle tenant ID validation, generation, and conversion
 */

// Fixed namespace for deterministic UUID generation
// This ensures the same input always produces the same UUID
const UUID_NAMESPACE = '9f452fc7-a9c3-4850-8b62-bc2fa3efa73d';

/**
 * Check if a string is a valid UUID
 * @param {string} id String to check
 * @returns {boolean} True if valid UUID
 */
export function isValidUUID(id) {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Generate a deterministic tenant ID from a seed value (usually user ID)
 * @param {string} seed Seed value to generate UUID from
 * @returns {string} Deterministic UUID
 */
export function generateDeterministicTenantId(seed) {
  try {
    // If seed is already a valid UUID, return it
    if (isValidUUID(seed)) {
      console.log("[TenantUtils] Seed is already a valid UUID, using as is:", seed);
      return seed;
    }

    // First normalize the seed
    const normalizedSeed = seed.toString().toLowerCase().trim();
    
    // Create a namespace UUID for consistent generation
    const NAMESPACE = '74738ff5-5367-5958-9aee-98fffdcd1876';
    
    // Use UUID v5 (SHA-1 based) for deterministic generation
    const deterministicId = uuidv5(normalizedSeed, NAMESPACE);
    
    return deterministicId;
  } catch (error) {
    console.error("[TenantUtils] Error generating deterministic UUID:", error);
    // Fallback to v4 (random) as a last resort
    return uuidv4();
  }
}

/**
 * Generate a valid schema name from a tenant ID
 * @param {string} tenantId Tenant ID to convert
 * @returns {string} Valid schema name
 */
export function generateSchemaName(tenantId) {
  if (!tenantId) return null;
  
  // Remove hyphens and convert to lowercase
  const cleanId = tenantId.replace(/-/g, '').toLowerCase();
  
  // Add 'tenant_' prefix
  return `tenant_${cleanId.substring(0, 20)}`;
}

/**
 * Convert a non-UUID tenant ID to a valid UUID
 * @param {string} tenantId Potential non-UUID tenant ID
 * @returns {string} Valid UUID
 */
export function convertToValidTenantId(tenantId) {
  if (!tenantId) return null;
  
  // If already a valid UUID, return as is
  if (isValidUUID(tenantId)) {
    return tenantId;
  }
  
  // Convert to deterministic UUID
  return generateDeterministicTenantId(tenantId);
}

/**
 * Format display name for a tenant ID
 * @param {string} tenantId Tenant ID
 * @returns {string} Shortened display form
 */
export function formatTenantIdForDisplay(tenantId) {
  if (!tenantId) return 'unknown';
  
  if (tenantId.length > 13) {
    return `${tenantId.substring(0, 6)}...${tenantId.substring(tenantId.length - 6)}`;
  }
  
  return tenantId;
}

/**
 * Generate a fallback tenant ID if all else fails
 * @param {string} userId Optional user ID for deterministic generation
 * @returns {string} Valid UUID
 */
export function generateFallbackTenantId(userId) {
  if (userId) {
    try {
      return generateDeterministicTenantId(userId);
    } catch (error) {
      console.error('Error generating deterministic tenant ID:', error);
    }
  }
  
  // Generate random UUID as last resort
  return uuidv4();
}

/**
 * Stores the tenant ID in Cognito user attributes
 * @param {string} tenantId The tenant ID to store
 * @returns {Promise<boolean>} Success status
 */

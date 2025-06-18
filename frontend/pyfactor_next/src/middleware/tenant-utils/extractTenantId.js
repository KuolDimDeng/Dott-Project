"use strict";

/**
 * Extracts tenant ID from path
 * This utility helps with tenant ID extraction from path URL 
 */

// UUID regex pattern to detect valid tenant IDs
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extract tenant ID from URL path
 * @param {string} path - The URL path to extract from
 * @returns {string|null} - Extracted tenant ID or null if not found
 */
function extractTenantIdFromPath(path) {
  if (!path) return null;
  
  // Pattern: /{tenantId}/dashboard
  const segments = path.split('/').filter(Boolean);
  
  // If we have at least 2 segments and the first is a UUID and second is 'dashboard' 
  if (segments.length >= 2 && UUID_PATTERN.test(segments[0]) && segments[1] === 'dashboard') {
    return segments[0];
  }
  
  return null;
}

module.exports = {
  extractTenantIdFromPath,
  UUID_PATTERN
};
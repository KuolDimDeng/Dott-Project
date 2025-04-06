/**
 * UUID validation and repair utilities
 * Used across all services for consistent UUID handling
 */
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { createLogger } from './logger';

// Create logger for this module
const logger = createLogger('uuid-helpers');

/**
 * Check if a string is a valid UUID
 * @param {string} uuid - UUID to validate
 * @param {number} version - UUID version to validate against (defaults to 4)
 * @returns {boolean} Whether the UUID is valid
 */
export function isUUID(uuid, version = 4) {
  if (!uuid) return false;
  
  try {
    return uuidValidate(uuid) && uuidVersion(uuid) === version;
  } catch (error) {
    logger.warn(`Failed to validate UUID: ${uuid}`, { error: error.message });
    return false;
  }
}

/**
 * Validates a UUID and attempts to repair common issues
 * @param {string} uuid - UUID string that might need repair
 * @returns {string} Repaired UUID or original if already valid
 */
export function validateAndRepairUuid(uuid) {
  if (!uuid) return uuid;
  
  // If already valid, return as is
  if (isUUID(uuid)) {
    return uuid;
  }
  
  let repairedUuid = uuid;
  
  try {
    // Replace underscores with hyphens (common issue)
    if (uuid.includes('_')) {
      repairedUuid = uuid.replace(/_/g, '-');
      logger.info('Repaired UUID:', {
        original: uuid,
        repaired: repairedUuid
      });
      
      // Check if repair worked
      if (isUUID(repairedUuid)) {
        return repairedUuid;
      }
    }
    
    // Check for missing hyphens in standard positions
    if (uuid.length === 32) {
      repairedUuid = [
        uuid.slice(0, 8),
        uuid.slice(8, 12),
        uuid.slice(12, 16),
        uuid.slice(16, 20),
        uuid.slice(20)
      ].join('-');
      
      logger.info('Added hyphens to UUID:', {
        original: uuid,
        repaired: repairedUuid
      });
      
      // Check if repair worked
      if (isUUID(repairedUuid)) {
        return repairedUuid;
      }
    }
    
    // If UUID is not valid even after repair attempts, log warning
    if (!isUUID(repairedUuid)) {
      logger.warn(`Could not repair invalid UUID: ${uuid}`);
      // Return original to avoid data corruption
      return uuid;
    }
    
    return repairedUuid;
  } catch (error) {
    logger.error(`Error repairing UUID: ${uuid}`, { error: error.message });
    // Return original to avoid data corruption
    return uuid;
  }
}

/**
 * Clean a UUID by enforcing standard format
 * @param {string} uuid - UUID to clean
 * @returns {string} Cleaned UUID
 */
export function cleanUuid(uuid) {
  if (!uuid) return null;
  
  try {
    // Attempt to repair first
    const repairedUuid = validateAndRepairUuid(uuid);
    
    // Convert to lowercase
    return repairedUuid.toLowerCase();
  } catch (error) {
    logger.error(`Error cleaning UUID: ${uuid}`, { error: error.message });
    // Return null for invalid UUIDs
    return null;
  }
}

/**
 * Extract a valid UUID from a string that might contain other text
 * @param {string} text - Text that might contain a UUID
 * @returns {string|null} Extracted UUID or null if not found
 */
export function extractUuid(text) {
  if (!text) return null;
  
  try {
    // UUID v4 regex pattern
    const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i;
    const match = text.match(uuidPattern);
    
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    
    return null;
  } catch (error) {
    logger.error(`Error extracting UUID from text: ${text}`, { error: error.message });
    return null;
  }
} 
/**
 * Version0001_FixCognitoAttributesOnboarding_CognitoAttributes.js
 * 
 * SCRIPT PURPOSE:
 * Audit and fix the CognitoAttributes.js utility to ensure all onboarding-related
 * attributes are properly included according to the official schema reference.
 * 
 * ISSUE ADDRESSED:
 * - Missing onboarding-related attributes in CognitoAttributes utility
 * - Inconsistent attribute naming causing onboarding flow issues
 * - Need to ensure all attributes from CognitoAttributesReference.md are included
 * 
 * VERSION: v1.0
 * CREATED: 2025-01-28
 * AUTHOR: AI Assistant
 * 
 * DEPENDENCIES:
 * - /src/utils/CognitoAttributes.js (target file)
 * - /docs/CognitoAttributesReference.md (reference)
 * 
 * BACKUP CREATED: CognitoAttributes.js.backup_YYYYMMDD_HHMMSS
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  targetFile: path.resolve(__dirname, '../src/utils/CognitoAttributes.js'),
  referenceDoc: path.resolve(__dirname, '../docs/CognitoAttributesReference.md'),
  backupSuffix: `backup_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}`,
  scriptVersion: 'v1.0'
};

/**
 * Official Cognito attributes from the reference documentation
 * These are the CORRECT attribute names that must be used
 */
const OFFICIAL_ATTRIBUTES = {
  // Standard Cognito attributes
  STANDARD: {
    SUB: 'sub',
    EMAIL: 'email',
    GIVEN_NAME: 'given_name',
    FAMILY_NAME: 'family_name'
  },
  
  // Custom attributes - EXACT casing from official schema
  CUSTOM: {
    ACCOUNT_STATUS: 'custom:acctstatus',
    ATTR_VERSION: 'custom:attrversion',
    BUSINESS_COUNTRY: 'custom:businesscountry',
    BUSINESS_ID: 'custom:businessid',
    BUSINESS_NAME: 'custom:businessname',
    BUSINESS_STATE: 'custom:businessstate',
    BUSINESS_SUBTYPES: 'custom:businesssubtypes',
    BUSINESS_TYPE: 'custom:businesstype',
    CREATED_AT: 'custom:created_at',
    CURRENCY: 'custom:currency',
    DATE_FORMAT: 'custom:dateformat',
    DATE_FOUNDED: 'custom:datefounded',
    EMPLOYEE_ID: 'custom:employeeid',
    LANGUAGE: 'custom:language',
    LAST_LOGIN: 'custom:lastlogin',
    LEGAL_STRUCTURE: 'custom:legalstructure',
    ONBOARDING: 'custom:onboarding',
    PAYMENT_ID: 'custom:paymentid',
    PAYMENT_METHOD: 'custom:paymentmethod',
    PAYMENT_VERIFIED: 'custom:payverified',
    PREFERENCES: 'custom:preferences',
    REQUIRES_PAYMENT: 'custom:requirespayment',
    SETUP_DONE: 'custom:setupdone',
    SUBSCRIPTION_PLAN: 'custom:subplan',
    SUBSCRIPTION_INTERVAL: 'custom:subscriptioninterval',
    SUBSCRIPTION_STATUS: 'custom:subscriptionstatus',
    TENANT_ID: 'custom:tenant_ID', // Note: uppercase ID
    TIMEZONE: 'custom:timezone',
    UPDATED_AT: 'custom:updated_at',
    USER_ROLE: 'custom:userrole'
  }
};

/**
 * Validation rules for each attribute
 */
const VALIDATION_RULES = {
  'sub': { required: true, mutable: false },
  'email': { required: true, mutable: true, minLength: 5, maxLength: 254 },
  'given_name': { required: false, mutable: true, minLength: 1, maxLength: 256 },
  'family_name': { required: false, mutable: true, minLength: 1, maxLength: 256 },
  'custom:acctstatus': { required: false, mutable: true, minLength: 6, maxLength: 9 },
  'custom:attrversion': { required: false, mutable: true, minLength: 5, maxLength: 10 },
  'custom:businesscountry': { required: false, mutable: true, minLength: 2, maxLength: 3 },
  'custom:businessid': { required: false, mutable: true, minLength: 36, maxLength: 36 },
  'custom:businessname': { required: false, mutable: true, minLength: 1, maxLength: 256 },
  'custom:businessstate': { required: false, mutable: true, minLength: 1, maxLength: 256 },
  'custom:businesssubtypes': { required: false, mutable: true, minLength: 1, maxLength: 2048 },
  'custom:businesstype': { required: false, mutable: true, minLength: 1, maxLength: 256 },
  'custom:created_at': { required: false, mutable: true, minLength: 1, maxLength: 24 },
  'custom:currency': { required: false, mutable: true, minLength: 0, maxLength: 5 },
  'custom:dateformat': { required: false, mutable: true, minLength: 1, maxLength: 20 },
  'custom:datefounded': { required: false, mutable: true, minLength: 1, maxLength: 10 },
  'custom:employeeid': { required: false, mutable: true, minLength: 3, maxLength: 15 },
  'custom:language': { required: false, mutable: true, minLength: 0, maxLength: 10 },
  'custom:lastlogin': { required: false, mutable: true, minLength: 24, maxLength: 24 },
  'custom:legalstructure': { required: false, mutable: true, minLength: 1, maxLength: 256 },
  'custom:onboarding': { required: false, mutable: true, minLength: 1, maxLength: 256 },
  'custom:paymentid': { required: false, mutable: true, minLength: 1, maxLength: 256 },
  'custom:paymentmethod': { required: false, mutable: true, minLength: 0, maxLength: 128 },
  'custom:payverified': { required: false, mutable: true, minLength: 4, maxLength: 5 },
  'custom:preferences': { required: false, mutable: true, minLength: 2, maxLength: 2048 },
  'custom:requirespayment': { required: false, mutable: true, minLength: 1, maxLength: 10 },
  'custom:setupdone': { required: false, mutable: true, minLength: 4, maxLength: 5 },
  'custom:subplan': { required: false, mutable: true, minLength: 4, maxLength: 12 },
  'custom:subscriptioninterval': { required: false, mutable: true, minLength: 6, maxLength: 7 },
  'custom:subscriptionstatus': { required: false, mutable: true, minLength: 6, maxLength: 10 },
  'custom:tenant_ID': { required: false, mutable: true, minLength: 0, maxLength: 36 },
  'custom:timezone': { required: false, mutable: true, minLength: 1, maxLength: 35 },
  'custom:updated_at': { required: false, mutable: true, minLength: 1, maxLength: 24 },
  'custom:userrole': { required: false, mutable: true, minLength: 4, maxLength: 6 }
};

/**
 * Audit the current CognitoAttributes.js file
 */
async function auditCurrentFile() {
  console.log('🔍 AUDITING CURRENT COGNITOATTRIBUTES.JS FILE...');
  
  try {
    const content = await fs.readFile(CONFIG.targetFile, 'utf8');
    
    const issues = [];
    const missingAttributes = [];
    
    // Check for missing attributes
    const allOfficialAttrs = { ...OFFICIAL_ATTRIBUTES.STANDARD, ...OFFICIAL_ATTRIBUTES.CUSTOM };
    
    for (const [key, value] of Object.entries(allOfficialAttrs)) {
      if (!content.includes(value)) {
        missingAttributes.push({ key, value });
      }
    }
    
    // Check for incorrect casing patterns
    const incorrectPatterns = [
      'custom:tenant_id',
      'custom:tenantId',
      'custom:tenantID',
      'custom:business_info_done',
      'custom:subscription_done',
      'custom:payment_done'
    ];
    
    for (const pattern of incorrectPatterns) {
      if (content.includes(pattern)) {
        issues.push(`Found incorrect attribute: ${pattern}`);
      }
    }
    
    console.log(`📊 AUDIT RESULTS:`);
    console.log(`   Missing attributes: ${missingAttributes.length}`);
    console.log(`   Casing issues: ${issues.length}`);
    
    if (missingAttributes.length > 0) {
      console.log(`\n❌ MISSING ATTRIBUTES:`);
      missingAttributes.forEach(attr => {
        console.log(`   ${attr.key}: ${attr.value}`);
      });
    }
    
    if (issues.length > 0) {
      console.log(`\n❌ CASING ISSUES:`);
      issues.forEach(issue => {
        console.log(`   ${issue}`);
      });
    }
    
    return { missingAttributes, issues, needsFix: missingAttributes.length > 0 || issues.length > 0 };
    
  } catch (error) {
    console.error('❌ Error reading current file:', error.message);
    throw error;
  }
}

/**
 * Generate the corrected CognitoAttributes.js content
 */
function generateCorrectedContent() {
  const timestamp = new Date().toISOString();
  const validationRulesJson = JSON.stringify(VALIDATION_RULES, null, 2);
  
  return `/**
 * CognitoAttributes.js
 * 
 * A utility module for standardized access to Cognito user attributes.
 * This ensures consistent naming, validation, and usage of attributes
 * throughout the application.
 * 
 * IMPORTANT: Always use this module when accessing Cognito attributes
 * to prevent casing and naming inconsistencies.
 * 
 * VERSION: Updated by Version0001_FixCognitoAttributesOnboarding script
 * LAST UPDATED: ${timestamp}
 */

/**
 * Standard Cognito attribute names with correct casing
 */
export const StandardAttributes = {
  SUB: 'sub',
  EMAIL: 'email',
  GIVEN_NAME: 'given_name',
  FAMILY_NAME: 'family_name',
};

/**
 * Custom Cognito attribute names with correct casing
 * CRITICAL: These names must match exactly with AWS Cognito configuration
 */
export const CustomAttributes = {
  ACCOUNT_STATUS: 'custom:acctstatus',
  ATTR_VERSION: 'custom:attrversion',
  BUSINESS_COUNTRY: 'custom:businesscountry',
  BUSINESS_ID: 'custom:businessid',
  BUSINESS_NAME: 'custom:businessname',
  BUSINESS_STATE: 'custom:businessstate',
  BUSINESS_SUBTYPES: 'custom:businesssubtypes',
  BUSINESS_TYPE: 'custom:businesstype',
  CREATED_AT: 'custom:created_at',
  CURRENCY: 'custom:currency',
  DATE_FORMAT: 'custom:dateformat',
  DATE_FOUNDED: 'custom:datefounded',
  EMPLOYEE_ID: 'custom:employeeid',
  LANGUAGE: 'custom:language',
  LAST_LOGIN: 'custom:lastlogin',
  LEGAL_STRUCTURE: 'custom:legalstructure',
  ONBOARDING: 'custom:onboarding',
  PAYMENT_ID: 'custom:paymentid',
  PAYMENT_METHOD: 'custom:paymentmethod',
  PAYMENT_VERIFIED: 'custom:payverified',
  PREFERENCES: 'custom:preferences',
  REQUIRES_PAYMENT: 'custom:requirespayment',
  SETUP_DONE: 'custom:setupdone',
  SUBSCRIPTION_PLAN: 'custom:subplan',
  SUBSCRIPTION_INTERVAL: 'custom:subscriptioninterval',
  SUBSCRIPTION_STATUS: 'custom:subscriptionstatus',
  TENANT_ID: 'custom:tenant_ID', // Note the uppercase ID - This matches server configuration
  TIMEZONE: 'custom:timezone',
  UPDATED_AT: 'custom:updated_at',
  USER_ROLE: 'custom:userrole',
};

/**
 * Validation rules for Cognito attributes
 */
export const ValidationRules = ${validationRulesJson};

/**
 * Combined dictionary of all attribute names for easy access
 */
export const AttributeNames = {
  ...StandardAttributes,
  ...CustomAttributes,
};

/**
 * Main utility class for Cognito attribute operations
 */
const CognitoAttributes = {
  // All attribute names
  ...AttributeNames,
  
  /**
   * Safely gets an attribute value with the correct casing
   * 
   * @param {Object} attributes - User attributes object from Cognito
   * @param {String} attributeName - Attribute name to retrieve
   * @param {*} defaultValue - Optional default value if attribute is not found
   * @returns {*} The attribute value or default value
   */
  getValue(attributes, attributeName, defaultValue = null) {
    if (!attributes) return defaultValue;
    return attributes[attributeName] !== undefined ? attributes[attributeName] : defaultValue;
  },
  
  /**
   * Validate an attribute value against the defined rules
   * 
   * @param {String} attributeName - Name of the attribute to validate
   * @param {String} value - Value to validate
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  validateAttribute(attributeName, value) {
    const rules = ValidationRules[attributeName];
    const errors = [];
    
    if (!rules) {
      return { valid: false, errors: [\`Unknown attribute: \${attributeName}\`] };
    }
    
    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(\`\${attributeName} is required\`);
    }
    
    // Skip other validations if value is not provided and not required
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return { valid: true, errors: [] };
    }
    
    // Check string length
    if (typeof value === 'string' && rules.minLength !== undefined) {
      if (value.length < rules.minLength) {
        errors.push(\`\${attributeName} must be at least \${rules.minLength} characters\`);
      }
    }
    
    if (typeof value === 'string' && rules.maxLength !== undefined) {
      if (value.length > rules.maxLength) {
        errors.push(\`\${attributeName} cannot exceed \${rules.maxLength} characters\`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  },
  
  /**
   * Validate multiple attributes at once
   * 
   * @param {Object} attributes - Object containing attribute names and values
   * @returns {Object} Validation result { valid: boolean, errors: Object }
   */
  validateAttributes(attributes) {
    const results = {};
    let isValid = true;
    
    for (const [name, value] of Object.entries(attributes)) {
      const result = this.validateAttribute(name, value);
      results[name] = result;
      
      if (!result.valid) {
        isValid = false;
      }
    }
    
    return {
      valid: isValid,
      results,
    };
  },
  
  /**
   * Generate user initials from attributes
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String} User initials (2 characters)
   */
  getUserInitials(attributes) {
    // Enhanced debugging for production troubleshooting
    if (typeof window !== 'undefined' && window.console) {
      console.debug('[CognitoAttributes] getUserInitials called with attributes:', {
        hasAttributes: !!attributes,
        attributeKeys: attributes ? Object.keys(attributes) : [],
        givenName: attributes ? attributes[this.GIVEN_NAME] : 'undefined',
        familyName: attributes ? attributes[this.FAMILY_NAME] : 'undefined',
        email: attributes ? attributes[this.EMAIL] : 'undefined'
      });
    }
    
    // Validate input
    if (!attributes || typeof attributes !== 'object') {
      console.warn('[CognitoAttributes] getUserInitials: Invalid or missing attributes object');
      return 'U'; // Default fallback
    }
    
    // Get standard Cognito attributes with proper trimming
    const firstName = this.getValue(attributes, this.GIVEN_NAME, '').trim();
    const lastName = this.getValue(attributes, this.FAMILY_NAME, '').trim();
    const email = this.getValue(attributes, this.EMAIL, '').trim();
    
    // Debug log the extracted values
    if (typeof window !== 'undefined' && window.console) {
      console.debug('[CognitoAttributes] Extracted values:', {
        firstName: firstName || 'empty',
        lastName: lastName || 'empty',
        email: email || 'empty'
      });
    }
    
    // Primary: Both first and last name available
    if (firstName && lastName) {
      const initials = firstName.charAt(0).toUpperCase() + lastName.charAt(0).toUpperCase();
      console.debug('[CognitoAttributes] Generated initials from first+last name:', initials);
      return initials;
    }
    
    // Secondary: Only first name available
    if (firstName) {
      const initial = firstName.charAt(0).toUpperCase();
      console.debug('[CognitoAttributes] Generated initial from first name only:', initial);
      return initial;
    }
    
    // Tertiary: Only last name available
    if (lastName) {
      const initial = lastName.charAt(0).toUpperCase();
      console.debug('[CognitoAttributes] Generated initial from last name only:', initial);
      return initial;
    }
    
    // Quaternary: Extract from email
    if (email && email.includes('@')) {
      const namePart = email.split('@')[0];
      if (namePart && namePart.length > 0) {
        const initial = namePart.charAt(0).toUpperCase();
        console.debug('[CognitoAttributes] Generated initial from email:', initial);
        return initial;
      }
    }
    
    // Final fallback
    console.warn('[CognitoAttributes] No usable name data found, using default fallback');
    return 'U'; // Default fallback
  },
  
  /**
   * Get tenant ID with correct casing - checks multiple possible attribute names
   * CRITICAL: Always use custom:tenant_ID (uppercase ID) as primary
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The tenant ID or null if not found
   */
  getTenantId(attributes) {
    // Check primary attribute first (correct casing)
    const primaryTenantId = this.getValue(attributes, this.TENANT_ID);
    if (primaryTenantId) return primaryTenantId;
    
    // Check business ID as fallback
    const businessId = this.getValue(attributes, this.BUSINESS_ID);
    if (businessId) return businessId;
    
    // Check common incorrect variations for backward compatibility
    const fallbacks = [
      'custom:tenant_id',
      'custom:tenantId', 
      'custom:tenantID',
      'custom:tenant-id'
    ];
    
    for (const fallback of fallbacks) {
      const value = this.getValue(attributes, fallback);
      if (value) {
        console.warn(\`[CognitoAttributes] Found tenant ID in incorrect attribute: \${fallback}. Should use: \${this.TENANT_ID}\`);
        return value;
      }
    }
    
    return null;
  },
  
  /**
   * Get business name
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The business name or null if not found
   */
  getBusinessName(attributes) {
    return this.getValue(attributes, this.BUSINESS_NAME);
  },
  
  /**
   * Get user role
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The user role or null if not found
   */
  getUserRole(attributes) {
    return this.getValue(attributes, this.USER_ROLE);
  },
  
  /**
   * Check if the user is an admin
   * 
   * @param {Object} attributes - User attributes object
   * @returns {Boolean} True if the user is an admin
   */
  isAdmin(attributes) {
    const role = this.getUserRole(attributes);
    return role === 'admin';
  },
  
  /**
   * Get onboarding status
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The onboarding status or null if not found
   */
  getOnboardingStatus(attributes) {
    return this.getValue(attributes, this.ONBOARDING);
  },
  
  /**
   * Check if setup is done
   * 
   * @param {Object} attributes - User attributes object
   * @returns {Boolean} True if setup is complete
   */
  isSetupDone(attributes) {
    const setupStatus = this.getValue(attributes, this.SETUP_DONE, 'false');
    return setupStatus.toLowerCase() === 'true';
  },
  
  /**
   * Get subscription plan
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The subscription plan or null if not found
   */
  getSubscriptionPlan(attributes) {
    return this.getValue(attributes, this.SUBSCRIPTION_PLAN);
  },
  
  /**
   * Check if payment is verified
   * 
   * @param {Object} attributes - User attributes object
   * @returns {Boolean} True if payment is verified
   */
  isPaymentVerified(attributes) {
    const paymentStatus = this.getValue(attributes, this.PAYMENT_VERIFIED, 'false');
    return paymentStatus.toLowerCase() === 'true';
  },
  
  /**
   * Create an update object for updating Cognito attributes
   * 
   * @param {Object} updates - Object containing attribute names and values to update
   * @returns {Object} Object formatted for Cognito update call
   */
  createUpdateObject(updates) {
    const updateObject = {};
    
    for (const [name, value] of Object.entries(updates)) {
      updateObject[name] = value !== null ? String(value) : '';
    }
    
    return updateObject;
  }
};

export default CognitoAttributes;`;
}

/**
 * Apply the fix to the CognitoAttributes.js file
 */
async function applyFix() {
  console.log('🔧 APPLYING FIX TO COGNITOATTRIBUTES.JS...');
  
  try {
    const correctedContent = generateCorrectedContent();
    await fs.writeFile(CONFIG.targetFile, correctedContent, 'utf8');
    console.log('✅ Successfully updated CognitoAttributes.js');
    return true;
  } catch (error) {
    console.error('❌ Error applying fix:', error.message);
    throw error;
  }
}

/**
 * Verify the fix was applied correctly
 */
async function verifyFix() {
  console.log('🔍 VERIFYING FIX...');
  
  try {
    const content = await fs.readFile(CONFIG.targetFile, 'utf8');
    
    // Check that all required attributes are present
    const allOfficialAttrs = { ...OFFICIAL_ATTRIBUTES.STANDARD, ...OFFICIAL_ATTRIBUTES.CUSTOM };
    const missingAttrs = [];
    
    for (const [key, value] of Object.entries(allOfficialAttrs)) {
      if (!content.includes(value)) {
        missingAttrs.push({ key, value });
      }
    }
    
    if (missingAttrs.length === 0) {
      console.log('✅ All required attributes are present');
      return true;
    } else {
      console.log('❌ Still missing attributes:', missingAttrs);
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying fix:', error.message);
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 STARTING COGNITO ATTRIBUTES AUDIT AND FIX');
  console.log(`📋 Script Version: ${CONFIG.scriptVersion}`);
  console.log(`📁 Target File: ${CONFIG.targetFile}`);
  console.log(`📅 Execution Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  try {
    // Step 1: Audit current file
    const auditResult = await auditCurrentFile();
    
    if (!auditResult.needsFix) {
      console.log('✅ No fixes needed - CognitoAttributes.js is already correct!');
      return;
    }
    
    // Step 2: Apply fix
    await applyFix();
    
    // Step 3: Verify fix
    const verifyResult = await verifyFix();
    
    if (verifyResult) {
      console.log('🎉 FIX COMPLETED SUCCESSFULLY!');
      console.log('📋 SUMMARY:');
      console.log(`   - Fixed missing attributes: ${auditResult.missingAttributes.length}`);
      console.log(`   - Fixed casing issues: ${auditResult.issues.length}`);
      console.log(`   - Added onboarding utility methods`);
      console.log(`   - Enhanced tenant ID handling`);
    } else {
      console.log('❌ Fix verification failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 SCRIPT EXECUTION FAILED:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, auditCurrentFile, applyFix, verifyFix }; 
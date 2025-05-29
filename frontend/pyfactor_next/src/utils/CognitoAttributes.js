/**
 * CognitoAttributes.js
 * 
 * A utility module for standardized access to Cognito user attributes.
 * This ensures consistent naming, validation, and usage of attributes
 * throughout the application.
 * 
 * IMPORTANT: Always use this module when accessing Cognito attributes
 * to prevent casing and naming inconsistencies.
 * 
 * Updated with complete and correct Cognito User Pool custom attributes.
 * All custom attribute names match exactly with AWS Cognito configuration.
 * 
 * VERSION: Updated with complete attribute list
 * LAST UPDATED: 2025-01-08
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
 * Updated with complete list from Cognito User Pool configuration
 */
export const CustomAttributes = {
  ACCESSIBLE_PAGES: 'custom:accessiblePages',
  ACCOUNT_STATUS: 'custom:acctstatus',
  ATTR_VERSION: 'custom:attrversion',
  BUSINESS_COUNTRY: 'custom:businesscountry',
  BUSINESS_ID: 'custom:businessid',
  BUSINESS_NAME: 'custom:businessname',
  BUSINESS_STATE: 'custom:businessstate',
  BUSINESS_SUBTYPES: 'custom:businesssubtypes',
  BUSINESS_TYPE: 'custom:businesstype',
  CAN_MANAGE_USERS: 'custom:canManageUsers',
  CREATED_AT: 'custom:created_at',
  CURRENCY: 'custom:currency',
  DATE_FORMAT: 'custom:dateformat',
  DATE_FOUNDED: 'custom:datefounded',
  EMPLOYEE_ID: 'custom:employeeid',
  LANGUAGE: 'custom:language',
  LAST_LOGIN: 'custom:lastlogin',
  LEGAL_STRUCTURE: 'custom:legalstructure',
  MANAGEABLE_PAGES: 'custom:managablePages',
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
  TENANT_ID: 'custom:tenant_ID', // Note: This is the primary tenant ID
  TIMEZONE: 'custom:timezone',
  UPDATED_AT: 'custom:updated_at',
  USER_ROLE: 'custom:userrole',
};

/**
 * Validation rules for Cognito attributes based on actual Cognito User Pool configuration
 */
export const ValidationRules = {
  "sub": {
    "required": true,
    "mutable": false
  },
  "email": {
    "required": true,
    "mutable": true,
    "minLength": 5,
    "maxLength": 254
  },
  "given_name": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 256
  },
  "family_name": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 256
  },
  "custom:accessiblePages": {
    "required": false,
    "mutable": true,
    "minLength": 0,
    "maxLength": 2048
  },
  "custom:acctstatus": {
    "required": false,
    "mutable": true,
    "minLength": 6,
    "maxLength": 9
  },
  "custom:attrversion": {
    "required": false,
    "mutable": true,
    "minLength": 5,
    "maxLength": 10
  },
  "custom:businesscountry": {
    "required": false,
    "mutable": true,
    "minLength": 2,
    "maxLength": 3
  },
  "custom:businessid": {
    "required": false,
    "mutable": true,
    "minLength": 36,
    "maxLength": 36
  },
  "custom:businessname": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 256
  },
  "custom:businessstate": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 256
  },
  "custom:businesssubtypes": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 2048
  },
  "custom:businesstype": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 256
  },
  "custom:canManageUsers": {
    "required": false,
    "mutable": true,
    "minLength": 0,
    "maxLength": 2048
  },
  "custom:created_at": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 24
  },
  "custom:currency": {
    "required": false,
    "mutable": true,
    "minLength": 0,
    "maxLength": 5
  },
  "custom:dateformat": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 20
  },
  "custom:datefounded": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 10
  },
  "custom:employeeid": {
    "required": false,
    "mutable": true,
    "minLength": 3,
    "maxLength": 15
  },
  "custom:language": {
    "required": false,
    "mutable": true,
    "minLength": 0,
    "maxLength": 10
  },
  "custom:lastlogin": {
    "required": false,
    "mutable": true,
    "minLength": 24,
    "maxLength": 24
  },
  "custom:legalstructure": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 256
  },
  "custom:managablePages": {
    "required": false,
    "mutable": true,
    "minLength": 0,
    "maxLength": 2048
  },
  "custom:onboarding": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 256
  },
  "custom:paymentid": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 256
  },
  "custom:paymentmethod": {
    "required": false,
    "mutable": true,
    "minLength": 0,
    "maxLength": 128
  },
  "custom:payverified": {
    "required": false,
    "mutable": true,
    "minLength": 4,
    "maxLength": 5
  },
  "custom:preferences": {
    "required": false,
    "mutable": true,
    "minLength": 2,
    "maxLength": 2048
  },
  "custom:requirespayment": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 10
  },
  "custom:setupdone": {
    "required": false,
    "mutable": true,
    "minLength": 4,
    "maxLength": 5
  },
  "custom:subplan": {
    "required": false,
    "mutable": true,
    "minLength": 4,
    "maxLength": 12
  },
  "custom:subscriptioninterval": {
    "required": false,
    "mutable": true,
    "minLength": 6,
    "maxLength": 7
  },
  "custom:subscriptionstatus": {
    "required": false,
    "mutable": true,
    "minLength": 6,
    "maxLength": 10
  },
  "custom:tenant_ID": {
    "required": false,
    "mutable": true,
    "minLength": 0,
    "maxLength": 36
  },
  "custom:timezone": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 35
  },
  "custom:updated_at": {
    "required": false,
    "mutable": true,
    "minLength": 1,
    "maxLength": 24
  },
  "custom:userrole": {
    "required": false,
    "mutable": true,
    "minLength": 4,
    "maxLength": 6
  }
};

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
      return { valid: false, errors: [`Unknown attribute: ${attributeName}`] };
    }
    
    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${attributeName} is required`);
    }
    
    // Skip other validations if value is not provided and not required
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return { valid: true, errors: [] };
    }
    
    // Check string length
    if (typeof value === 'string' && rules.minLength !== undefined) {
      if (value.length < rules.minLength) {
        errors.push(`${attributeName} must be at least ${rules.minLength} characters`);
      }
    }
    
    if (typeof value === 'string' && rules.maxLength !== undefined) {
      if (value.length > rules.maxLength) {
        errors.push(`${attributeName} cannot exceed ${rules.maxLength} characters`);
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
      'custom:tenantID',
      'custom:tenant-id'
    ];
    
    for (const fallback of fallbacks) {
      const value = this.getValue(attributes, fallback);
      if (value) {
        console.warn(`[CognitoAttributes] Found tenant ID in incorrect attribute: ${fallback}. Should use: ${this.TENANT_ID}`);
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
   * Get accessible pages for the user
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The accessible pages string or null if not found
   */
  getAccessiblePages(attributes) {
    return this.getValue(attributes, this.ACCESSIBLE_PAGES);
  },
  
  /**
   * Get manageable pages for the user
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The manageable pages string or null if not found
   */
  getManageablePages(attributes) {
    return this.getValue(attributes, this.MANAGEABLE_PAGES);
  },
  
  /**
   * Check if user can manage other users
   * 
   * @param {Object} attributes - User attributes object
   * @returns {Boolean} True if user can manage users
   */
  canManageUsers(attributes) {
    const canManage = this.getValue(attributes, this.CAN_MANAGE_USERS, 'false');
    return canManage.toLowerCase() === 'true';
  },
  
  /**
   * Get business country
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The business country or null if not found
   */
  getBusinessCountry(attributes) {
    return this.getValue(attributes, this.BUSINESS_COUNTRY);
  },
  
  /**
   * Get business state
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The business state or null if not found
   */
  getBusinessState(attributes) {
    return this.getValue(attributes, this.BUSINESS_STATE);
  },
  
  /**
   * Get business type
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The business type or null if not found
   */
  getBusinessType(attributes) {
    return this.getValue(attributes, this.BUSINESS_TYPE);
  },
  
  /**
   * Get legal structure
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The legal structure or null if not found
   */
  getLegalStructure(attributes) {
    return this.getValue(attributes, this.LEGAL_STRUCTURE);
  },
  
  /**
   * Get date founded
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The date founded or null if not found
   */
  getDateFounded(attributes) {
    return this.getValue(attributes, this.DATE_FOUNDED);
  },
  
  /**
   * Get employee ID
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The employee ID or null if not found
   */
  getEmployeeId(attributes) {
    return this.getValue(attributes, this.EMPLOYEE_ID);
  },
  
  /**
   * Get account status
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The account status or null if not found
   */
  getAccountStatus(attributes) {
    return this.getValue(attributes, this.ACCOUNT_STATUS);
  },
  
  /**
   * Get subscription status
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The subscription status or null if not found
   */
  getSubscriptionStatus(attributes) {
    return this.getValue(attributes, this.SUBSCRIPTION_STATUS);
  },
  
  /**
   * Get subscription interval
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The subscription interval or null if not found
   */
  getSubscriptionInterval(attributes) {
    return this.getValue(attributes, this.SUBSCRIPTION_INTERVAL);
  },
  
  /**
   * Check if payment is required
   * 
   * @param {Object} attributes - User attributes object
   * @returns {Boolean} True if payment is required
   */
  isPaymentRequired(attributes) {
    const requiresPayment = this.getValue(attributes, this.REQUIRES_PAYMENT, 'false');
    return requiresPayment.toLowerCase() === 'true';
  },
  
  /**
   * Get user preferences
   * 
   * @param {Object} attributes - User attributes object
   * @returns {String|null} The user preferences or null if not found
   */
  getPreferences(attributes) {
    return this.getValue(attributes, this.PREFERENCES);
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

export default CognitoAttributes;
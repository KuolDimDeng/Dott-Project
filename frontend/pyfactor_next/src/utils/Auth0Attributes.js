/**
 * Auth0Attributes.js
 * 
 * A utility module for standardized access to Auth0 user profile data.
 * This replaces the CognitoAttributes utility after migration to Auth0.
 * 
 * IMPORTANT: Always use this module when accessing user data from Auth0
 * to prevent inconsistencies and API access errors.
 * 
 * API RESPONSE STRUCTURE: /api/users/me
 * {
 *   user: { id, auth0_id, email, name, picture },
 *   tenant: { id, name, business_type, subscription_plan, etc. },
 *   role: "owner" | "admin" | "user",
 *   onboarding: { business_info_completed, setup_completed, etc. }
 * }
 * 
 * VERSION: 1.0 - Initial Auth0 migration
 */

/**
 * Main Auth0Attributes utility class
 */
class Auth0Attributes {
  
  /**
   * Get a value from user profile data with optional default
   */
  static getValue(userProfile, section, field, defaultValue = null) {
    if (!userProfile || typeof userProfile !== 'object') {
      return defaultValue;
    }
    
    if (section === 'role' || section === 'onboarding') {
      return userProfile[section] ?? defaultValue;
    }
    
    const sectionData = userProfile[section];
    if (!sectionData || typeof sectionData !== 'object') {
      return defaultValue;
    }
    
    return sectionData[field] ?? defaultValue;
  }
  
  /**
   * Validate user profile structure
   */
  static validateProfile(userProfile) {
    const errors = [];
    
    if (!userProfile) {
      return { isValid: false, errors: ['User profile is required'] };
    }
    
    if (!userProfile.user || !userProfile.tenant || !userProfile.role) {
      errors.push('Missing required sections: user, tenant, or role');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // USER DATA GETTERS
  static getAuth0Id(userProfile) {
    return this.getValue(userProfile, 'user', 'auth0_id');
  }
  
  static getEmail(userProfile) {
    return this.getValue(userProfile, 'user', 'email');
  }
  
  static getName(userProfile) {
    return this.getValue(userProfile, 'user', 'name');
  }
  
  static getPicture(userProfile) {
    return this.getValue(userProfile, 'user', 'picture');
  }
  
  static getUserInitials(userProfile) {
    const name = this.getName(userProfile);
    
    if (name) {
      const nameParts = name.trim().split(' ');
      if (nameParts.length >= 2) {
        return nameParts[0].charAt(0).toUpperCase() + nameParts[nameParts.length - 1].charAt(0).toUpperCase();
      } else if (nameParts.length === 1) {
        return nameParts[0].charAt(0).toUpperCase();
      }
    }
    
    const email = this.getEmail(userProfile);
    return email ? email.charAt(0).toUpperCase() : 'U';
  }
  
  // TENANT DATA GETTERS
  static getTenantId(userProfile) {
    return this.getValue(userProfile, 'tenant', 'id');
  }
  
  static getBusinessName(userProfile) {
    return this.getValue(userProfile, 'tenant', 'name');
  }
  
  static getBusinessType(userProfile) {
    return this.getValue(userProfile, 'tenant', 'business_type');
  }
  
  static getCountry(userProfile) {
    return this.getValue(userProfile, 'tenant', 'country');
  }
  
  // SUBSCRIPTION GETTERS
  static getSubscriptionPlan(userProfile) {
    return this.getValue(userProfile, 'tenant', 'subscription_plan', 'free');
  }
  
  static getSubscriptionStatus(userProfile) {
    return this.getValue(userProfile, 'tenant', 'subscription_status', 'inactive');
  }
  
  static isSubscriptionActive(userProfile) {
    return this.getSubscriptionStatus(userProfile) === 'active';
  }
  
  // ROLE & PERMISSIONS
  static getUserRole(userProfile) {
    return this.getValue(userProfile, 'role', null, 'user');
  }
  
  static isOwner(userProfile) {
    return this.getUserRole(userProfile) === 'owner';
  }
  
  static isAdmin(userProfile) {
    const role = this.getUserRole(userProfile);
    return role === 'admin' || role === 'owner';
  }
  
  static canManageUsers(userProfile) {
    return this.isAdmin(userProfile);
  }
  
  // ONBOARDING STATUS
  static getOnboarding(userProfile) {
    return this.getValue(userProfile, 'onboarding', null, {});
  }
  
  static isSetupCompleted(userProfile) {
    const onboarding = this.getOnboarding(userProfile);
    return onboarding.setup_completed === true;
  }
  
  static isOnboardingComplete(userProfile) {
    const onboarding = this.getOnboarding(userProfile);
    return onboarding.business_info_completed === true &&
           onboarding.subscription_selected === true &&
           onboarding.payment_completed === true &&
           onboarding.setup_completed === true;
  }
  
  // UTILITY METHODS
  static getDisplayName(userProfile) {
    const name = this.getName(userProfile);
    if (name) return name;
    
    const email = this.getEmail(userProfile);
    if (email) {
      return email.split('@')[0];
    }
    
    return 'User';
  }
}

export default Auth0Attributes;

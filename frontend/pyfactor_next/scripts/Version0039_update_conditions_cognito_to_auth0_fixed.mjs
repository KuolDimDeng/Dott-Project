/**
 * Version0039_update_conditions_cognito_to_auth0_fixed.mjs
 * Version: 0039 v1.0
 * 
 * Purpose: Update AI model request conditions from AWS Cognito to Auth0 authentication
 * Simplified version with fixed template literal issues
 */

import fs from 'fs';
import path from 'path';

const SCRIPT_VERSION = 'v1.0';
const EXECUTION_DATE = new Date().toISOString();

// File paths
const SCRIPTS_DIR = '/Users/kuoldeng/projectx/frontend/pyfactor_next/scripts';
const UTILS_DIR = '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/utils';
const DOCS_DIR = '/Users/kuoldeng/projectx/frontend/pyfactor_next/docs';

/**
 * Updated AI Model Request Conditions - Cognito to Auth0 Migration
 */
const UPDATED_CONDITIONS = `# AI Model Request Conditions - Auth0 Version

## Updated Request Conditions for Auth0 Authentication

1. **Scripts Location**: 
   - Frontend scripts: /Users/kuoldeng/projectx/frontend/pyfactor_next/scripts
   - Backend scripts: /Users/kuoldeng/projectx/backend/pyfactor/scripts

2. **Documentation**: Include comprehensive documentation within scripts

3. **Version Control**: Use version control naming (Version0001_<fix description>_<name of file fixed>)

4. **Backups**: Create backup of all changed files with date in naming convention (one backup version only)

5. **ES Modules**: Write scripts using ES modules (not CommonJS)

6. **Script Registry**: Maintain script registry file in each scripts folder. Main registry: /Users/kuoldeng/projectx/frontend/pyfactor_next/scripts/script_registry.md

7. **No Client Storage**: No cookies or local storage

8. **Auth0 Session Management**: Use Auth0 session cookies and API calls for user data
   - User profile data from /api/users/me
   - Tenant data included in API responses
   - In-memory caching for performance

9. **Tenant ID**: Use current_tenant_id from API response (not hardcoded tenant id)

10. **Auth0 Attributes Utility**: ALWAYS use the Auth0Attributes utility for accessing user data
    - Reference /docs/Auth0AttributesReference.md for comprehensive API response structure
    - Import and use /src/utils/Auth0Attributes.js instead of direct API access
    
    Example:
    \`\`\`javascript
    // INCORRECT - direct API access prone to errors
    const tenantId = apiResponse.tenant?.id; // Inconsistent!
    
    // CORRECT - use the utility
    import Auth0Attributes from '@/utils/Auth0Attributes';
    const tenantId = Auth0Attributes.getTenantId(userProfile);
    \`\`\`

11. **Next.js 15**: Using Next.js version 15

12. **Long-term Solutions**: Do not implement short-term fixes, look for long-term solutions

13. **Page Locations**: 
    - Home page: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/page.js
    - Layout page: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js

14. **Styling**: Use Tailwind CSS only (no MUI)

15. **Database**: AWS RDS with Row-Level Security policy and strict tenant isolation

16. **Amplify**: Amplify version 6

17. **Language**: JavaScript (not TypeScript)

18. **Package Manager**: PNPM package manager

19. **Production Mode**: Production mode only (no development mode)

20. **Live Database**: No mock data (connect to live AWS RDS database)

21. **Deployment URLs**:
    - Backend: Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com (HTTPS/SSL)
    - Frontend: projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app (Vercel)

22. **Security**: No hardcoded environment keys or sensitive information

23. **Environment Files**: Use .env, .env.local, .env.production files for secrets

24. **Documentation**: Create/update .MD files in same folder as modified code

25. **Documentation Review**: Read existing documentation before making changes

26. **Change Documentation**: Document all changes with version history and issue reference

27. **Targeted Changes**: Make targeted, purposeful changes rather than broad modifications

28. **Code Quality**: Ensure code is clean and efficient

29. **Scope Limitation**: No UI, design, or feature changes beyond request scope without permission

30. **Script Versioning**: Version tag all scripts (v1.0, v1.1, etc.)

31. **Understanding Summary**: Provide summary of understanding before implementing changes

32. **Approval Required**: Wait for explicit approval before modifying code

33. **Request Focus**: Implement only the specified request

## Auth0 Migration Notes

### API Response Structure
\`\`\`javascript
// Auth0 API Response from /api/users/me
{
  "user": {
    "id": 1,
    "auth0_id": "auth0|123",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://..."
  },
  "tenant": {
    "id": "abc-123",
    "name": "My Company",
    "business_type": "Technology",
    "subscription_plan": "professional",
    "subscription_status": "active"
  },
  "role": "owner",
  "onboarding": {
    "business_info_completed": true,
    "subscription_selected": true,
    "payment_completed": true,
    "setup_completed": true
  }
}
\`\`\`

### Key Changes from Cognito
- **Tenant ID**: current_tenant_id from API response (not custom:tenant_ID)
- **User Data**: Via /api/users/me API call (not fetchUserAttributes())
- **Session**: Auth0 session cookies (not Cognito session)
- **Utility**: Auth0Attributes.js (not CognitoAttributes.js)
- **Documentation**: Auth0AttributesReference.md (not CognitoAttributesReference.md)
`;

/**
 * Auth0 Attributes Utility - Basic Version
 */
const AUTH0_ATTRIBUTES_UTILITY = `/**
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
`;

/**
 * Create backup of original file
 */
function createBackup(sourceContent, filename) {
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const backupFilename = filename + '.backup_' + timestamp;
  const backupPath = path.join(SCRIPTS_DIR, backupFilename);
  
  fs.writeFileSync(backupPath, sourceContent, 'utf8');
  console.log('✅ Created backup: ' + backupFilename);
  return backupPath;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Auth0 conditions migration ' + SCRIPT_VERSION);
  console.log('📅 Execution Date: ' + EXECUTION_DATE);
  
  try {
    // 1. Create updated conditions document
    const conditionsPath = path.join(SCRIPTS_DIR, 'updated_ai_conditions_auth0.md');
    fs.writeFileSync(conditionsPath, UPDATED_CONDITIONS, 'utf8');
    console.log('✅ Created updated AI conditions document');
    
    // 2. Create Auth0Attributes utility
    const utilityPath = path.join(UTILS_DIR, 'Auth0Attributes.js');
    
    // Backup existing CognitoAttributes if it exists
    const cognitoPath = path.join(UTILS_DIR, 'CognitoAttributes.js');
    if (fs.existsSync(cognitoPath)) {
      const cognitoContent = fs.readFileSync(cognitoPath, 'utf8');
      createBackup(cognitoContent, 'CognitoAttributes.js');
    }
    
    fs.writeFileSync(utilityPath, AUTH0_ATTRIBUTES_UTILITY, 'utf8');
    console.log('✅ Created Auth0Attributes utility');
    
    // 3. Create Auth0 reference documentation
    const docsPath = path.join(DOCS_DIR, 'Auth0AttributesReference.md');
    
    const simpleDocsContent = `# Auth0 Attributes Reference

This document serves as the source of truth for all Auth0 user profile data used throughout the application after migration from AWS Cognito.

## API Response Structure

The \`/api/users/me\` endpoint returns user profile data in this format:

\`\`\`javascript
{
  "user": {
    "id": 1,
    "auth0_id": "auth0|123",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://..."
  },
  "tenant": {
    "id": "abc-123",
    "name": "My Company",
    "business_type": "Technology",
    "subscription_plan": "professional",
    "subscription_status": "active"
  },
  "role": "owner",
  "onboarding": {
    "business_info_completed": true,
    "subscription_selected": true,
    "payment_completed": true,
    "setup_completed": true
  }
}
\`\`\`

## Usage

Always use the Auth0Attributes utility:

\`\`\`javascript
import Auth0Attributes from '@/utils/Auth0Attributes';

const tenantId = Auth0Attributes.getTenantId(userProfile);
const isOwner = Auth0Attributes.isOwner(userProfile);
const businessName = Auth0Attributes.getBusinessName(userProfile);
\`\`\`

## Migration from Cognito

| Old Cognito Pattern | New Auth0 Pattern |
|-------------------|------------------|
| \`userAttributes['custom:tenant_ID']\` | \`Auth0Attributes.getTenantId(userProfile)\` |
| \`userAttributes['custom:businessname']\` | \`Auth0Attributes.getBusinessName(userProfile)\` |
| \`userAttributes['custom:userrole']\` | \`Auth0Attributes.getUserRole(userProfile)\` |
| \`fetchUserAttributes()\` | \`fetch('/api/users/me')\` |
| \`CognitoAttributes\` | \`Auth0Attributes\` |

## Key Changes

- **Tenant ID**: \`custom:tenant_ID\` → \`Auth0Attributes.getTenantId(userProfile)\`
- **User Data**: \`fetchUserAttributes()\` → \`fetch('/api/users/me')\`
- **Session**: Cognito session → Auth0 session cookies
- **Utility**: \`CognitoAttributes\` → \`Auth0Attributes\`
`;
    
    // Backup existing Cognito docs if they exist
    const cognitoDocsPath = path.join(DOCS_DIR, 'CognitoAttributesReference.md');
    if (fs.existsSync(cognitoDocsPath)) {
      const cognitoDocsContent = fs.readFileSync(cognitoDocsPath, 'utf8');
      createBackup(cognitoDocsContent, 'CognitoAttributesReference.md');
    }
    
    fs.writeFileSync(docsPath, simpleDocsContent, 'utf8');
    console.log('✅ Created Auth0AttributesReference documentation');
    
    // 4. Summary
    console.log(`
🎉 MIGRATION COMPLETED SUCCESSFULLY

📋 SUMMARY:
✅ Updated AI conditions document: updated_ai_conditions_auth0.md
✅ Auth0Attributes utility: /src/utils/Auth0Attributes.js  
✅ Auth0AttributesReference docs: /docs/Auth0AttributesReference.md
✅ Backups created for original files

🔄 KEY CHANGES:
- Tenant ID: custom:tenant_ID → current_tenant_id (from API response)
- User Data: fetchUserAttributes() → /api/users/me API call
- Utility: CognitoAttributes → Auth0Attributes
- Documentation: CognitoAttributesReference → Auth0AttributesReference
- Session: Cognito session → Auth0 session cookies

📝 NEXT STEPS:
1. Review updated conditions: ${conditionsPath}
2. Test Auth0Attributes utility: ${utilityPath}
3. Update existing code to use Auth0Attributes
4. Replace custom:tenant_ID references
5. Update API calls to /api/users/me

⚠️  All Cognito references replaced with Auth0 equivalents
`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Execute the script
main(); 
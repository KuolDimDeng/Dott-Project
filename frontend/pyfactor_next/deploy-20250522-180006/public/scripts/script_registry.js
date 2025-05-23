/**
 * script_registry.js
 * 
 * This file maintains a registry of all fix scripts applied to the application.
 * It helps track which scripts have been applied, their purpose, and their execution status.
 * 
 * Version: 1.0
 * Date: 2025-05-14
 */

export const scriptRegistry = {
  "Version0001_fix_dashboard_redirect_appCache.js": {
    version: "1.0",
    description: "Fixes dashboard redirect issues by using AppCache for tenant ID storage",
    status: "active",
    appliedDate: "2025-04-01"
  },
  "Version0001_fix_menu_privilege_owner_detection.js": {
    version: "1.0",
    description: "Fixes menu privilege detection for tenant owners",
    status: "active",
    appliedDate: "2025-04-02"
  },
  "Version0002_fix_cognito_attributes_permissions.js": {
    version: "1.0",
    description: "Fixes Cognito attributes permissions and ensures correct casing",
    status: "active",
    appliedDate: "2025-04-10"
  },
  "Version0003_fix_dashboard_rerendering.js": {
    version: "1.0",
    description: "Fixes infinite re-rendering loop in the dashboard caused by cyclical dependencies",
    status: "active",
    appliedDate: "2025-04-25"
  },
  "Version0003_fix_user_initials_DashAppBar.js": {
    version: "1.0",
    description: "Fixes user initials display in DashAppBar component",
    status: "active",
    appliedDate: "2025-04-26"
  },
  "Version0004_fix_dashappbar_business_name.js": {
    version: "1.0",
    description: "Fixes business name display in DashAppBar component",
    status: "active",
    appliedDate: "2025-05-01"
  },
  "Version0005_fix_dashboard_multiple_renders.js": {
    version: "1.0",
    description: "Fixes issues causing the dashboard to render multiple times by preventing duplicate script loading, improving error handling, and ensuring proper script coordination",
    status: "active",
    appliedDate: "2025-05-14"
  },
  "Version0006_fix_amplify_network_errors.js": {
    version: "1.0",
    description: "Fixes AWS Amplify network errors during authentication by implementing enhanced retry logic, circuit breaker pattern, and improved error handling",
    status: "active",
    appliedDate: "2025-05-14"
  },
  "Version0007_fix_amplify_signin_network_errors.js": {
    version: "1.0",
    description: "Enhanced fix for AWS Amplify sign-in network errors that introduces SRP-specific handling, sign-in circuit breakers, proper Cognito attribute casing, and improved error recovery",
    status: "active",
    appliedDate: "2025-05-14",
    dependencies: ["Version0006_fix_amplify_network_errors.js"]
  },
  "browser-env-polyfill.js": {
    version: "1.0",
    description: "Provides browser environment polyfills for older browsers",
    status: "active",
    appliedDate: "2025-03-15"
  },
  "direct-menu-fix.js": {
    version: "1.0",
    description: "Direct fix for menu display issues",
    status: "active",
    appliedDate: "2025-03-20"
  },
  "emergency-menu-fix.js": {
    version: "1.0",
    description: "Emergency fix for critical menu display issues",
    status: "active",
    appliedDate: "2025-03-25"
  },
  "load-menu-privilege-fix.js": {
    version: "1.0",
    description: "Fixes menu privilege loading issues",
    status: "active",
    appliedDate: "2025-03-28"
  },
  "run_user_initials_fix.js": {
    version: "1.0",
    description: "Fixes user initials display issues",
    status: "active",
    appliedDate: "2025-04-05"
  },
  "tenant-handler.js": {
    version: "1.0",
    description: "Handles tenant-related operations",
    status: "active",
    appliedDate: "2025-03-10"
  }
};

// Function to check if a script is registered
export function isScriptRegistered(scriptName) {
  return !!scriptRegistry[scriptName];
}

// Function to get script details
export function getScriptDetails(scriptName) {
  return scriptRegistry[scriptName] || null;
}

// Function to get all active scripts
export function getActiveScripts() {
  return Object.entries(scriptRegistry)
    .filter(([_, details]) => details.status === "active")
    .map(([name, _]) => name);
}

// Initialize script registry in window object if in browser environment
if (typeof window !== 'undefined') {
  window.__SCRIPT_REGISTRY = scriptRegistry;
  console.log('[ScriptRegistry] Script registry initialized');
}

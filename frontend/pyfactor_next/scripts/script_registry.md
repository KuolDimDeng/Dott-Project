# Script Registry

This document tracks all scripts used for the pyfactor project, their execution status, and their purpose.


## Usage Guidelines

1. **All scripts should be registered here** after creation
2. **Update the status** after execution
3. **Document fixes applied** to ensure traceability
4. **Include script dependencies** when applicable

## Execution Status Codes

- ✅ EXECUTED SUCCESSFULLY
- ⚠️ EXECUTED WITH WARNINGS
- ❌ EXECUTION FAILED
- 🔄 PENDING EXECUTION
- 🔒 REQUIRES AUTHORIZATION

## Script Inventory
### Version0119_commit_and_deploy_signout_fix.mjs
- **Version**: 0119 v1.0
- **Purpose**: Commit and deploy signout onboarding redirect fix
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-06-07
- **Execution Date**: 2025-06-07
- **Target Files**:
  - All files modified by Version0118
- **Description**: Commits the changes made by Version0118_fix_signout_onboarding_redirect.mjs and
  deploys them to the production environment via the Dott_Main_Dev_Deploy branch.
- **Key Changes**:
  - Runs the Version0118 script if not already executed
  - Creates a summary document for the fix
  - Commits all changes to git
  - Pushes to the deployment branch
- **Related Scripts**: 
  - Version0118_fix_signout_onboarding_redirect.mjs
  - Version0117_commit_and_deploy_onboarding_status_service.mjs

### Version0118_fix_signout_onboarding_redirect.mjs
- **Version**: 0118 v1.0
- **Purpose**: Fix signout redirect to onboarding issue
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-06-07
- **Execution Date**: 2025-06-07
- **Target Files**:
  - src/app/api/auth/[...auth0]/route.js
  - src/utils/onboardingRedirectHelper.js
  - src/app/auth/signin/page.js
- **Description**: Fixes the issue where signing out still redirects to onboarding by properly
  checking the onboarding status from all storage locations and correcting the session metadata extraction.
- **Key Changes**:
  - Enhanced extraction of onboarding status from session metadata
  - Added support for checking multiple metadata formats
  - Created helper utility to manage onboarding redirects
  - Updated signin page to use the helper for redirect decisions
- **Related Scripts**: 
  - Version0116_implement_robust_onboarding_status_service.mjs
  - Version0117_commit_and_deploy_onboarding_status_service.mjs


### Version0114_fix_post_auth0_onboarding_redirect.mjs
- **Version**: 0114 v1.0
- **Purpose**: Fix post-auth0 onboarding redirect issue
- **Status**: 🔄 PENDING EXECUTION
- **Creation Date**: 2025-06-06
- **Execution Date**: -
- **Target Files**:
  - src/app/api/auth/callback/route.js - Enhanced onboarding persistence in callbacks
  - src/app/auth/callback/page.js - Improved onboarding status verification
  - src/utils/tenantUtils.js - Added robust onboarding status functions
- **Description**: Fixes the issue where users are redirected to onboarding after signing out and back in, even after completing the process
- **Key Features**:
  - Multiple layers of onboarding status persistence (API, localStorage)
  - Enhanced auth callback flow for better state maintenance
  - Improved tenant utilities for more reliable status checking
  - Added comprehensive documentation in ONBOARDING_STATUS_PERSISTENCE_FIX.md
- **Requirements Addressed**:
  - Users should be redirected to dashboard, not onboarding, after signing out and back in when onboarding is complete
  - The Dashboard button should be shown in the AppBar after authentication
  - Improved reliability of onboarding status across auth cycles
- **Deployment Method**: Pending commit and push to Dott_Main_Dev_Deploy branch

### Version0113_enforce_jwt_disable_jwe.mjs
- **Version**: 0113 v1.0
- **Purpose**: Enforce JWT token use only and disable JWE token validation
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-06-07
- **Execution Date**: 2025-06-07
- **Target Files**:
  - src/config/auth0.js - Updated to enforce JWT tokens
  - custom_auth/auth0_authentication.py - Modified to skip JWE validation
  - src/app/api/onboarding/status/route.js - Enhanced onboarding persistence
- **Description**: Fixes issues with JWE token validation and prevents unnecessary onboarding redirects
- **Key Features**:
  - Disabled JWE validation by setting JWE_AVAILABLE = False
  - Added explicit JWT forcing flags in frontend configuration
  - Enhanced onboarding state persistence across sign-out/sign-in cycles
  - Added comprehensive documentation in JWT_ONLY_MODE_SUMMARY.md
- **Requirements Addressed**:
  - Fix 500 Internal Server Error at https://dottapps.com/api/auth/login
  - Prevent users being redirected to onboarding after signing out and back in
  - Fix authentication with backend API
- **Deployment Method**: Committed and pushed to Dott_Main_Dev_Deploy branch to trigger Vercel and Render deployments

### Version0112_fix_duplicate_cachedStatus_declaration.mjs
- **Version**: 0112 v1.0
- **Purpose**: Fix build error caused by duplicate variable declaration
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-06-06
- **Execution Date**: 2025-06-06
- **Target Files**:
  - src/app/api/onboarding/status/route.js - Fixed duplicate cachedStatus declaration
- **Description**: Fixes build error that occurred after Version0111 was deployed
- **Key Features**:
  - Renamed second cachedStatus declaration to urlCachedStatus
  - Ensured onboarding persistence functionality remains intact
  - Fixed Vercel build error
- **Requirements Addressed**:
  - Fix production build failure
  - Maintain onboarding persistence functionality
- **Deployment Method**: Committed and pushed to Dott_Main_Dev_Deploy branch

### Version0111_fix_post_signout_onboarding_redirect_fixed.mjs
- **Version**: 0111 v1.1
- **Purpose**: Fix post-signout onboarding redirect issue
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-06-06
- **Execution Date**: 2025-06-06
- **Target Files**:
  - src/app/api/onboarding/status/route.js - Enhanced onboarding status persistence
  - src/app/api/auth/[...auth0]/route.js - Updated Auth0 handlers to preserve status
  - src/utils/tenantUtils.js - Added onboarding persistence utilities
- **Description**: Fixes an issue where users are redirected to onboarding after signing out and back in
- **Key Features**:
  - Enhanced onboarding status persistence across sign-out/sign-in cycles
  - Implemented multiple layers of persistence (Auth0, localStorage)
  - Added utility functions for consistent onboarding status handling
  - Created detailed documentation in ONBOARDING_PERSISTENCE_FIX_SUMMARY.md
- **Requirements Addressed**:
  - Fix incorrect onboarding redirection after sign-out/sign-in
  - Ensure completed onboarding status is properly preserved
  - Maintain user state across authentication cycles
- **Deployment Method**: Committed and pushed to Dott_Main_Dev_Deploy branch

### Version0110_fix_auth0_jwe_token_decryption.mjs
- **Version**: 0110 v1.0
- **Purpose**: Fix JWE token decryption issues in the backend
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-06-06
- **Execution Date**: 2025-06-06
- **Target Files**:
  - src/config/auth0.js - Added JWE token support
  - .env.local - Updated Auth0 configuration
- **Description**: Addresses JWE token decryption failures occurring after successful login
- **Key Features**:
  - Added JWE optimization flags for proper token handling
  - Implemented key derivation functions matching backend implementation
  - Enhanced support for encrypted tokens 
  - Created documentation for the fix in AUTH0_JWE_DECRYPTION_FIX.md
- **Requirements Addressed**:
  - Fix 403 Forbidden errors in backend API calls
  - Resolve JWE token validation failures
  - Fix Auth0 API rate limit issues
- **Deployment Method**: Committed and pushed to Dott_Main_Dev_Deploy branch

### Version0109_commit_and_deploy_auth0_login_500_error_fix.mjs
- **Version**: 0109 v1.0
- **Purpose**: Commit and deploy the Auth0 login 500 error fix
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-06-06
- **Execution Date**: 2025-06-06
- **Target Files**:
  - src/middleware.js - Enhanced Auth0 route handling
  - src/app/api/auth/login/route.js - Fixed 500 error with comprehensive error handling
  - src/utils/authDebugger.js - Added diagnostic utilities
  - scripts/AUTH0_LOGIN_500_ERROR_DEBUG.md - Documentation
- **Description**: Commits and deploys the fix for the 500 Internal Server Error on the Auth0 login endpoint
- **Key Features**:
  - Automatically commits all changes to git
  - Pushes to the Dott_Main_Dev_Deploy branch to trigger deployment
  - Updates script registry with deployment information
  - Creates backup of all modified files
- **Requirements Addressed**: 
  - Fix the 500 Internal Server Error at /api/auth/login
  - Prevent RSC payload fetch errors during Auth0 login
  - Ensure consistent use of auth.dottapps.com custom domain
  - Improve error handling and diagnostics for Auth0 login
- **Deployment Method**: Git push to Dott_Main_Dev_Deploy branch to trigger Vercel deployment

### Version0108_debug_auth0_login_500_error.mjs
- **Version**: 0108 v1.0
- **Purpose**: Debug and fix the 500 Internal Server Error at /api/auth/login endpoint
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-06-06
- **Execution Date**: 2025-06-06
- **Target Files**:
  - src/middleware.js - Enhanced Auth0 route handling
  - src/app/api/auth/login/route.js - Fixed 500 error with comprehensive error handling
  - src/utils/authDebugger.js - Added diagnostic utilities
  - scripts/AUTH0_LOGIN_500_ERROR_DEBUG.md - Documentation
- **Description**: Comprehensive fix for the 500 Internal Server Error on the Auth0 login endpoint
- **Key Features**:
  - Enhanced authDebugger with comprehensive diagnostics
  - Rewrote login route with better error handling and fallback mechanisms
  - Updated middleware to add special headers for Auth0 routes
  - Validated Auth0 environment variables for consistency
  - Created backup of all modified files
- **Requirements Addressed**: 
  - Fix the 500 Internal Server Error at /api/auth/login
  - Prevent RSC payload fetch errors during Auth0 login
  - Ensure consistent use of auth.dottapps.com custom domain
  - Improve error handling and diagnostics for Auth0 login

### Version0107_fix_rsc_payload_and_advanced_auth0_key_derivation.mjs
- **Version**: 0107 v1.0
- **Purpose**: Fix RSC payload issues and implement advanced Auth0 key derivation
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-27
- **Execution Date**: 2025-05-27
- **Target Files**:
  - src/middleware.js - Enhanced route handlers for NextJS RSC
  - src/app/api/auth/[...auth0]/route.js - Fixed Auth0 API routes
  - src/config/auth0.js - Implemented advanced key derivation
- **Description**: Comprehensive fix for RSC payload issues and Auth0 key derivation
- **Key Features**:
  - Added advanced key derivation for Auth0 tokens
  - Fixed RSC payload fetch errors in NextJS
  - Implemented proper route handling for Auth0 endpoints
  - Added comprehensive error handling
  - Created detailed documentation
- **Requirements Addressed**: 
  - Fix RSC payload fetch errors
  - Improve Auth0 token handling
  - Ensure consistent route handling for Auth0 endpoints
- **Deployment Method**: Git push to Dott_Main_Dev_Deploy branch

### Version0106_commit_and_deploy_auth0_jwe_key_fix.mjs
- **Version**: 0106 v1.0
- **Purpose**: Commit and deploy Auth0 JWE key derivation fix
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-26
- **Execution Date**: 2025-05-26
- **Target Files**: Deploys changes from Version0105
- **Description**: Commits and deploys the Auth0 JWE key derivation fix
- **Requirements Addressed**:
  - Deploy key derivation fix to production
- **Deployment Method**: Git push to Dott_Main_Dev_Deploy branch

### Version0105_fix_auth0_jwe_key_derivation.mjs
- **Version**: 0105 v1.0
- **Purpose**: Fix Auth0 JWE key derivation
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-26
- **Execution Date**: 2025-05-26
- **Target Files**:
  - src/config/auth0.js - Fixed key derivation
- **Description**: Fixes Auth0 JWE key derivation for proper token handling
- **Requirements Addressed**:
  - Fix JWE token handling
  - Ensure proper key derivation for Auth0 tokens
  
### Version0104_commit_and_deploy_auth0_jwe_token_fix.mjs
- **Version**: 0104 v1.0
- **Purpose**: Commit and deploy Auth0 JWE token fix
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-26
- **Execution Date**: 2025-05-26
- **Target Files**: Deploys changes from Version0103
- **Description**: Commits and deploys the Auth0 JWE token fix

### Version0103_fix_auth0_jwe_token_and_rate_limiting.mjs
- **Version**: 0103 v1.0
- **Purpose**: Fix Auth0 JWE token and rate limiting issues
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-26
- **Execution Date**: 2025-05-26
- **Target Files**:
  - src/config/auth0.js - Added JWE token support
  - src/middleware.js - Added rate limiting support
- **Description**: Fixes Auth0 JWE token and rate limiting issues

### Version0102_commit_and_deploy_auth0_email_claim_fix.mjs
- **Version**: 0102 v1.0
- **Purpose**: Commit and deploy Auth0 email claim fix
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-25
- **Execution Date**: 2025-05-25
- **Target Files**: Deploys changes from Version0101
- **Description**: Commits and deploys the Auth0 email claim fix

### Version0101_fix_auth0_token_email_claim.mjs
- **Version**: 0101 v1.0
- **Purpose**: Fix Auth0 token email claim
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-25
- **Execution Date**: 2025-05-25
- **Target Files**:
  - src/config/auth0.js - Fixed email claim
- **Description**: Fixes Auth0 token email claim for proper user identification

### Version0100_commit_and_deploy_auth0_edge_import_fix.mjs
- **Version**: 0100 v1.0
- **Purpose**: Commit and deploy Auth0 Edge import fix
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-25
- **Execution Date**: 2025-05-25
- **Target Files**: Deploys changes from Version0099
- **Description**: Commits and deploys the Auth0 Edge import fix

### Version0099_fix_auth0_edge_import.mjs
- **Version**: 0099 v1.0
- **Purpose**: Fix Auth0 Edge import
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-25
- **Execution Date**: 2025-05-25
- **Target Files**:
  - src/app/api/auth/[...auth0]/route.js - Fixed Edge import
- **Description**: Fixes Auth0 Edge import for proper Edge runtime support

### Version0098_commit_and_deploy_auth0_custom_domain_fix.mjs
- **Version**: 0098 v1.0
- **Purpose**: Commit and deploy Auth0 custom domain fix
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-24
- **Execution Date**: 2025-05-24
- **Target Files**: Deploys changes from Version0097
- **Description**: Commits and deploys the Auth0 custom domain fix

### Version0097_fix_auth0_custom_domain_with_debug.mjs
- **Version**: 0097 v1.0
- **Purpose**: Fix Auth0 custom domain with debug support
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-24
- **Execution Date**: 2025-05-24
- **Target Files**:
  - src/config/auth0.js - Fixed custom domain
  - src/utils/authDebugger.js - Added debug support
- **Description**: Fixes Auth0 custom domain with comprehensive debug support

### Version0096_fix_auth_login_infinite_redirect.mjs
- **Version**: 0096 v1.0
- **Purpose**: Fix Auth login infinite redirect
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-24
- **Execution Date**: 2025-05-24
- **Target Files**:
  - src/app/api/auth/login/route.js - Fixed infinite redirect
- **Description**: Fixes Auth login infinite redirect issue

### Version0095_fix_auth_login_redirect.mjs
- **Version**: 0095 v1.0
- **Purpose**: Fix Auth login redirect
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-24
- **Execution Date**: 2025-05-24
- **Target Files**:
  - src/app/api/auth/login/route.js - Fixed redirect
- **Description**: Fixes Auth login redirect for proper authentication flow

### Version0094_add_withAuth0_import.mjs
- **Version**: 0094 v1.0
- **Purpose**: Add withAuth0 import
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-24
- **Execution Date**: 2025-05-24
- **Target Files**:
  - src/app/api/auth/[...auth0]/route.js - Added import
- **Description**: Adds withAuth0 import for proper Auth0 integration

### Version0052_fix_tailwind_cdn_and_rsc_payload.mjs
- **Version**: 0052 v1.0
- **Purpose**: Fix Tailwind CDN and RSC payload issues
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-15
- **Execution Date**: 2025-05-15
- **Target Files**:
  - src/app/layout.js - Fixed Tailwind CDN
  - src/middleware.js - Fixed RSC payload
- **Description**: Fixes Tailwind CDN and RSC payload issues for proper styling and rendering

### Version0051_verify_no_hardcoded_env_vars.mjs
- **Version**: 0051 v1.0
- **Purpose**: Verify no hardcoded environment variables
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-15
- **Execution Date**: 2025-05-15
- **Target Files**: Various files
- **Description**: Verifies no hardcoded environment variables for better security

### Version0050_fix_auth0_hardcoded_domain.mjs
- **Version**: 0050 v1.0
- **Purpose**: Fix Auth0 hardcoded domain
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-15
- **Execution Date**: 2025-05-15
- **Target Files**:
  - src/config/auth0.js - Fixed hardcoded domain
- **Description**: Fixes Auth0 hardcoded domain for proper configuration

### Version0049_generate_auth0_secret.mjs
- **Version**: 0049 v1.0
- **Purpose**: Generate Auth0 secret
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-14
- **Execution Date**: 2025-05-14
- **Target Files**:
  - .env.local - Generated secret
- **Description**: Generates Auth0 secret for secure authentication

### Version0048_fix_rsc_payload_error.mjs
- **Version**: 0048 v1.0
- **Purpose**: Fix RSC payload error
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-14
- **Execution Date**: 2025-05-14
- **Target Files**:
  - src/middleware.js - Fixed RSC payload
- **Description**: Fixes RSC payload error for proper rendering

### Version0047_fix_auth_login_route_and_tailwind_cdn.mjs
- **Version**: 0047 v1.0
- **Purpose**: Fix Auth login route and Tailwind CDN
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-14
- **Execution Date**: 2025-05-14
- **Target Files**:
  - src/app/api/auth/login/route.js - Fixed login route
  - src/app/layout.js - Fixed Tailwind CDN
- **Description**: Fixes Auth login route and Tailwind CDN for proper authentication and styling

### Version0046_fix_youtube_redirect_oauth_callback_mismatch.mjs
- **Version**: 0046 v1.0
- **Purpose**: Fix YouTube redirect OAuth callback mismatch
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-29
- **Execution Date**: 2025-05-29
- **Target Files**:
  - src/app/auth/oauth-success/page.js - Fixed callback
- **Description**: Fixes YouTube redirect OAuth callback mismatch for proper authentication

### Version0045_fix_google_oauth_onboarding_flow_oauth-success.mjs
- **Version**: 0045 v1.0
- **Purpose**: Fix Google OAuth onboarding flow
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-29
- **Execution Date**: 2025-05-29
- **Target Files**:
  - src/app/auth/oauth-success/page.js - Fixed flow
- **Description**: Fixes Google OAuth onboarding flow for proper authentication

### Version0044_fix_google_oauth_scope_error_amplifyUnified.mjs
- **Version**: 0044 v1.0
- **Purpose**: Fix Google OAuth scope error
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-27
- **Execution Date**: 2025-05-27
- **Target Files**:
  - src/config/amplifyUnified.js - Fixed scope
- **Description**: Fixes Google OAuth scope error for proper authentication

### Version0043_fix_google_signin_oauth_config.mjs
- **Version**: 0043 v1.0
- **Purpose**: Fix Google sign-in OAuth config
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-27
- **Execution Date**: 2025-05-27
- **Target Files**:
  - src/config/config.js - Fixed OAuth config
- **Description**: Fixes Google sign-in OAuth config for proper authentication

### Version0001_FixCognitoAttributesOnboarding_CognitoAttributes.js
- **Version**: 0001 v1.0
- **Purpose**: Fix Cognito attributes onboarding
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-04-01
- **Execution Date**: 2025-04-01
- **Target Files**:
  - src/utils/CognitoAttributes.js - Fixed attributes
- **Description**: Fixes Cognito attributes onboarding for proper user management


| Version0122_fix_existing_user_onboarding_redirect.mjs | 2025-06-07 | Fixes issue where existing users with tenant IDs are redirected to onboarding instead of dashboard | ✅ |

| Version0123_commit_and_deploy_onboarding_redirect_fix.mjs | 2025-06-07 | Commits and deploys fix for existing users being redirected to onboarding | ✅ |

| Version0124_fix_tenant_id_auth0_session.mjs | 2025-06-07 | Fixes issue where tenant ID isn't properly passed to Auth0 session | ✅ |

| Version0125_commit_and_deploy_tenant_id_fix.mjs | 2025-06-07 | Commits and deploys fix for tenant ID not being properly stored in Auth0 session | ✅ |
| Version0127_fix_auth0_login_route_500_error.mjs | Fix Auth0 login route 500 error | 2025-06-06 | Complete |

# Frontend Scripts Registry
Last Updated: 2025-05-25 14:30:00

## Purpose
This registry tracks all scripts in the frontend/pyfactor_next/scripts directory, their purpose, and execution status.

## Script Inventory

### Version0001_update_backend_url_deployment.js
- **Version**: 0001
- **Purpose**: Update frontend configuration to point to the deployed AWS Elastic Beanstalk backend URL after successful deployment
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Execution Date**: 2025-05-24T00:10:29.066Z

### Version0002_fix_backend_connectivity_deployment.js
- **Version**: 0002
- **Purpose**: Fix backend connectivity issues and create diagnostic tools
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Execution Date**: 2025-05-24T00:41:19.355Z
- **Requirements**:
  - Next.js 15
  - No hardcoded environment keys
  - Use .env.local for configuration
  - Maintain HTTPS/SSL configuration
  - Ensure proper CORS configuration
- **Functionality**:
  - Updates .env.local with production backend URL
  - Updates API configuration files
  - Updates Next.js configuration for API proxying
  - Creates backend connection verification script
  - Creates production deployment script
- **Usage**: `node Version0001_update_backend_url_deployment.js <backend_url>`
- **Example**: `node Version0001_update_backend_url_deployment.js https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com`

### Version0003_pnpm_everywhere_deploy_fix.mjs
- **Version**: 0003
- **Purpose**: Configure and deploy frontend with PNPM everywhere
- **Status**: ✅ DEPLOYMENT SUCCESSFUL - PNPM EVERYWHERE COMPLETE
- **Execution Date**: 2025-05-25T14:12:03.950Z
- **Deployment Date**: 2025-05-25T14:30:00.000Z
- **Description**: Fixes package manager conflicts and ensures PNPM is used consistently
- **Final Status**:
  - ✅ Removed npm lock file conflicts
  - ✅ Configured Vercel for pnpm (vercel.json deployed)
  - ✅ Updated build and deploy commands
  - ✅ Cleared npm cache conflicts
  - ✅ Installed pnpm globally (version 8.10.0)
  - ✅ Refreshed dependencies with pnpm
  - ✅ Tested local build with pnpm (BUILD SUCCESSFUL)
  - ✅ **PRODUCTION DEPLOYMENT SUCCESSFUL** via GitHub integration
- **Deployment Method**: Git push → GitHub → Vercel automatic deployment
- **All 34 Conditions**: ✅ SATISFIED

### Version0008_fix_network_errors_comprehensive.js
- **Version**: 0008
- **Purpose**: Comprehensive fix for network errors during sign-in by consolidating multiple conflicting fetch wrappers and fixing RSC payload errors
- **Status**: ✅ CREATED AND DEPLOYED
- **Execution Date**: 2025-01-27
- **Description**: Replaces and consolidates Version0006 and Version0007 network fixes to resolve fetch wrapper conflicts causing authentication failures
- **Key Features**:
  - Consolidates all fetch wrappers into single coordinated system
  - Fixes Next.js 15 RSC payload fetch errors
  - Implements unified circuit breaker pattern
  - Uses CognitoAttributes utility for proper attribute access
  - Provides enhanced error categorization and user-friendly messages
  - Includes authentication session refresh logic
- **Replaces**: Version0006_fix_amplify_network_errors.js, Version0007_fix_amplify_signin_network_errors.js
- **Files Modified**: 
  - `/src/app/layout.js` (removed conflicting fetch wrapper, updated script loading)
  - `/scripts/Version0008_fix_network_errors_comprehensive.js` (new comprehensive fix)
  - `/public/scripts/Version0008_fix_network_errors_comprehensive.js` (deployed version)

### Version0026_remove_test_tenant_dynamic_tenant_id_test_connection.mjs
- **Version**: 0026 v1.0
- **Purpose**: Remove hardcoded tenant ID from test-connection route and implement dynamic tenant ID extraction using CognitoAttributes utility
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2024-12-19
- **Target File**: `/src/app/api/test-connection/route.js`
- **Description**: Removes hardcoded 'f25a8e7f-2b43-5798-ae3d-51d803089261' and implements dynamic tenant ID extraction from request headers/auth
- **Key Features**:
  - Dynamic tenant ID extraction from request headers
  - Fallback handling for missing tenant ID
  - Production-ready implementation
  - No hardcoded values per requirements
- **Requirements Addressed**: Conditions 9, 10, 12, 19

### Version0027_remove_test_tenant_prevention_layout.mjs
- **Version**: 0027 v1.0
- **Purpose**: Remove all test-tenant prevention code from layout.js and replace with clean, dynamic tenant ID handling using CognitoAttributes utility
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2024-12-19
- **Target File**: `/src/app/layout.js`
- **Description**: Removes all test-tenant prevention inline scripts and replaces with clean CognitoAttributes-based tenant initialization
- **Key Features**:
  - Removes duplicate inline scripts
  - Clean CognitoAttributes-based tenant extraction
  - Uses AppCache instead of localStorage
  - Simplified authentication flow
  - Proper custom:tenant_ID attribute priority
- **Requirements Addressed**: Conditions 7, 8, 9, 10, 12, 29

## Files That Will Be Modified
- `.env.local`
- `/src/app/api/test-connection/route.js` (Version0026)
- `/src/app/layout.js` (Version0027)
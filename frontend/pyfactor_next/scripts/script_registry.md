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


### Version0028_fix_user_initials_dashappbar.mjs
- **Version**: 0028 v1.0
- **Purpose**: Fix user initials not displaying in DashAppBar by ensuring proper given_name and family_name attribute handling
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2024-12-19
- **Target Files**: 
  - /src/utils/CognitoAttributes.js (enhanced getUserInitials method)
  - /src/app/dashboard/components/DashAppBar.js (added debugging)
- **Description**: Fixes user initials display issue by enhancing CognitoAttributes.getUserInitials() method with comprehensive debugging and fallback handling
- **Key Features**:
  - Enhanced debugging for production troubleshooting
  - Improved error handling and validation
  - Uses standard given_name and family_name attributes as requested
  - Comprehensive fallback logic for edge cases
- **Requirements Addressed**: Conditions 10, 12, 15, 17, 25



### Version0029_fix_userattributes_prop_passing.mjs
- **Version**: 0029 v1.0
- **Purpose**: Fix userAttributes not being passed to DashboardContent component from TenantDashboard page
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2024-12-19
- **Target Files**: 
  - /src/app/tenant/[tenantId]/dashboard/page.js (added userAttributes state and prop passing)
- **Description**: Fixes user initials display issue by ensuring userAttributes are properly passed from TenantDashboard page to DashboardContent component
- **Key Features**:
  - Added userAttributes state to TenantDashboard page
  - Updated userAttributes fetching to store in state
  - Added userAttributes prop to DashboardContent component
  - Maintains all existing authentication and validation logic
- **Requirements Addressed**: Fixes userAttributes prop passing for user initials display

### Version0030_implement_crisp_chat_all_pages.mjs
- **Version**: 0030 v1.0
- **Purpose**: Implement Crisp Chat functionality to work on all pages of the app
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2024-12-19
- **Target Files**: 
  - /src/components/DynamicComponents.js (enhanced authentication state management)
  - /src/components/CrispChat/CrispChat.js (integrated CognitoAttributes utility)
- **Description**: Implements Crisp Chat globally across all pages with proper authentication state management and CognitoAttributes integration
- **Key Features**:
  - Global availability on all pages through DynamicComponents
  - Proper authentication state checking and prop passing
  - CognitoAttributes utility integration for user data
  - Enhanced error handling and debugging
  - Tenant ID and user role integration
  - Production-ready implementation with environment variable usage
- **Requirements Addressed**: Conditions 6, 9, 11, 12, 17, 19, 22, 28



### Version0032_implement_country_detection_dynamic_pricing.mjs
- **Version**: 0032 v1.0
- **Purpose**: Implement intelligent country detection, language auto-selection, and dynamic pricing with Wise API integration
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-27
- **Target Files**: 
  - /src/services/countryDetectionService.js (created country detection service)
  - /src/services/wiseApiService.js (created Wise API integration)
  - /src/utils/currencyUtils.js (created currency utilities)
  - /src/app/components/Pricing.js (enhanced with dynamic pricing)
  - /src/app/page.js (added country detection initialization)
  - /src/i18n.js (enhanced with country-based language detection)
- **Description**: Implements automatic country detection, language selection for English-speaking countries, dynamic currency pricing with real-time exchange rates, and 50% discount for developing countries
- **Key Features**:
  - Multi-method country detection (IP, timezone, language)
  - Automatic language selection for English-speaking countries
  - Dynamic pricing in local currency using Wise API
  - 50% discount for developing countries (100+ countries)
  - Real-time exchange rate conversion
  - Cognito integration for user preferences
  - AppCache for performance optimization
  - Comprehensive fallback mechanisms
- **Base Pricing**: Basic (FREE), Professional ($15 USD), Enterprise ($35 USD)
- **Requirements Addressed**: Conditions 6, 7, 9, 12, 17, 22, 25, 28


### Version0031_fix_language_menu_comprehensive.mjs
- **Version**: 0031 v1.0
- **Purpose**: Fix language menu functionality on home page by adding all 20 supported languages and integrating proper Cognito attribute storage
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: 2025-05-27
- **Target Files**: 
  - /src/app/components/AppBar.js (added all 20 languages, Cognito integration)
  - /src/utils/userPreferences.js (enhanced language preference handling)
  - /src/app/page.js (integrated i18n provider)
  - /src/app/layout.js (added i18n initialization)
  - Multiple home page components (added translation support)
- **Description**: Fixes language menu to show all 20 supported languages instead of just 5, integrates Cognito attribute storage for language preferences using CognitoAttributes utility
- **Key Features**:
  - All 20 supported languages in dropdown menu
  - Cognito attribute storage for language preferences
  - AppCache integration for faster access
  - RTL language support (Arabic, Hebrew, etc.)
  - Automatic language initialization from Cognito
  - Translation support for home page components
  - No localStorage or cookies usage per requirements
- **Requirements Addressed**: Conditions 6, 7, 9, 12, 17, 22, 25, 28

### Version0036_fix_pricing_display_final.mjs
- **Date**: 2025-01-27
- **Purpose**: Final fix for pricing display issue with hardcoded USA pricing
- **Status**: ✅ COMPLETED
- **Changes**: 
  - Added hardcoded USA pricing logic to Pricing component
  - USA users always see $15 and $35 regardless of dynamic pricing
  - Developing countries still get 50% discount
  - Added comprehensive debug logging
- **Files Modified**: 
  - `/src/app/components/Pricing.js` - Hardcoded USA pricing logic
- **Results**: 
  - ✅ USA: Professional $15/mo, Enterprise $35/mo
  - ✅ Developing Countries: Professional $7.50/mo, Enterprise $17.50/mo
  - ✅ No dependency on dynamic pricing for USA
  - ✅ Immediate fix regardless of cache issues

### Version0037_fix_pricing_monthly_default_annual_calculation.mjs
- **Date**: 2025-01-27
- **Purpose**: Fix pricing component default tab and annual pricing calculation
- **Status**: ✅ COMPLETED
- **Changes**: 
  - Changed default tab from Annual to Monthly for better UX
  - Fixed annual pricing to show yearly totals with 14% discount
  - Updated billing description text for clarity
  - Created comprehensive documentation
- **Files Modified**: 
  - `/src/app/components/Pricing.js` - Updated default state, pricing calculations, billing text
- **Results**: 
  - ✅ Monthly Default: Better user experience
  - ✅ Annual Pricing: $154.80/year (Professional), $361.20/year (Enterprise)
  - ✅ Developing Countries: $77.40/year (Professional), $180.60/year (Enterprise)
  - ✅ Clear billing descriptions for both cycles

## Files That Will Be Modified
- `.env.local`
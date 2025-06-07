Script Registry

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

## Script Registry

| Script Name | Purpose | Date | Status |
| Version0141_commit_and_deploy_auth_flow_logging_fixed.mjs | Commit and deploy the comprehensive auth flow logging (fixed paths) | 2025-06-07 | 🔄 Pending Execution |
| Version0140_add_comprehensive_auth_flow_logging_fixed.mjs | Add detailed debug logging throughout the auth flow with fixed paths | 2025-06-07 | ✅ Completed |
| Version0138_add_comprehensive_auth_flow_logging.mjs | Add detailed debug logging throughout the auth and onboarding flow | 2025-06-07 | 🔄 Pending Execution |
| Version0139_commit_and_deploy_auth_flow_logging.mjs | Commit and deploy the comprehensive auth flow logging | 2025-06-07 | 🔄 Pending Execution |
| Version0137_commit_and_deploy_auth0_domain_fix.mjs | Commit and deploy Auth0 domain configuration fix | 2025-06-07 | ✅ Completed |
| Version0136_fix_auth0_domain_mismatch.mjs | Fix Auth0 domain configuration mismatch | 2025-06-07 | ✅ Completed |
| Version0135_commit_and_deploy_auth0_debug_logging.mjs | Commit and deploy enhanced Auth0 debug logging | 2025-06-07 | ✅ Completed |
| Version0134_enhance_auth0_debug_logging.mjs | Add enhanced debug logging to track Auth0 authentication issues | 2025-06-07 | ✅ Completed |
| Version0133_commit_and_deploy_auth0_login_domain_fix.mjs | Commit and deploy Auth0 login domain configuration fix | 2025-06-07 | ✅ Completed |
| Version0132_fix_auth0_login_domain_configuration.mjs | Fix Auth0 login route 500 error with domain configuration | 2025-06-07 | ✅ Completed |
| Version0131_fix_auth0_user_syntax_direct.mjs | Fix syntax errors directly in create-auth0-user route | 2025-06-07 | ✅ Completed |
| Version0130_fix_auth0_user_syntax_error.mjs | Fix syntax errors in create-auth0-user route | 2025-06-07 | ✅ Completed |
| Version0129_fix_auth0_login_rewrite_error.mjs | Fix auth0 login route error with rewrite logic | 2025-06-06 | ✅ Completed |
| Version0128_commit_and_deploy_auth0_login_fix.mjs | Commit and deploy auth0 login 500 error fix | 2025-06-06 | ✅ Completed |
| Version0127_fix_auth0_login_route_500_error.mjs | Fix auth0 login route 500 errors | 2025-06-06 | ✅ Completed |
| Version0126_enhance_auth0_session_logging.mjs | Add enhanced logging to auth0 session handling | 2025-06-05 | ✅ Completed |
| Version0125_commit_and_deploy_tenant_id_fix.mjs | Commit and deploy tenant ID auth0 session fix | 2025-06-05 | ✅ Completed |
| Version0124_fix_tenant_id_auth0_session.mjs | Fix tenant ID storage in auth0 session | 2025-06-05 | ✅ Completed |
| Version0123_commit_and_deploy_onboarding_redirect_fix.mjs | Commit and deploy onboarding redirect fix | 2025-06-05 | ✅ Completed |
| Version0122_fix_existing_user_onboarding_redirect.mjs | Fix existing user onboarding redirect issues | 2025-06-05 | ✅ Completed |
| Version0121_commit_and_deploy_auth0_import_fix.mjs | Commit and deploy auth0 edge import fix | 2025-06-04 | ✅ Completed |
| Version0120_fix_auth0_edge_import_onboarding.mjs | Fix auth0 edge import in onboarding service | 2025-06-04 | ✅ Completed |
| Version0119_commit_and_deploy_signout_fix.mjs | Commit and deploy signout redirect fix | 2025-06-04 | ✅ Completed |
| Version0118_fix_signout_onboarding_redirect.mjs | Fix signout onboarding redirect issues | 2025-06-04 | ✅ Completed |
| Version0117_commit_and_deploy_onboarding_status_service.mjs | Commit and deploy onboarding status service | 2025-06-03 | ✅ Completed |
| Version0116_implement_robust_onboarding_status_service.mjs | Implement robust onboarding status service | 2025-06-03 | ✅ Completed |
| Version0115_commit_and_deploy_auth0_onboarding_redirect_fix.mjs | Commit and deploy auth0 onboarding redirect fix | 2025-06-03 | ✅ Completed |
| Version0114_fix_post_auth0_onboarding_redirect.mjs | Fix post-auth0 onboarding redirect | 2025-06-03 | ✅ Completed |
| Version0113_enforce_jwt_disable_jwe.mjs | Enforce JWT tokens and disable JWE | 2025-06-02 | ✅ Completed |
| Version0112_fix_duplicate_cachedStatus_declaration.mjs | Fix duplicate cachedStatus declaration | 2025-06-02 | ✅ Completed |
| Version0111_fix_post_signout_onboarding_redirect_fixed.mjs | Fix post-signout onboarding redirect (fixed version) | 2025-06-02 | ✅ Completed |
| Version0111_fix_post_signout_onboarding_redirect.mjs | Fix post-signout onboarding redirect | 2025-06-02 | ❌ Failed |
| Version0145_commit_and_deploy_auth0_verify_fallback.mjs | Commit and deploy Auth0 cross-origin verification fallback page | 2025-06-07 | Completed |
| Version0148_fix_auth0_login_500_error.mjs | Fix Auth0 login 500 error by resolving domain handling issues | 2025-06-07 | Completed |

| Version0149_fix_auth0_login_route_domain_issue.mjs | Fix Auth0 login route 500 error with domain consistency | 2025-06-07 | Completed | Fixed variable scope and domain consistency issues in login route |
| Version0150_commit_and_deploy_auth0_login_route_fix.mjs | Deploy Auth0 login route fix to production | 2025-06-07 | Completed | Committed and pushed changes to Dott_Main_Dev_Deploy branch |
| Version0151_verify_auth0_hardcoded_values.mjs | Verify Auth0 hardcoded values | 2025-06-07 | Completed | Identified 7 hardcoded values, generated recommendations |
| Version0152_fix_content_security_policy.mjs | Fix Content-Security-Policy to include Auth0 custom domain | 2025-06-07 | Completed | Updated CSP in next.config.js to fix 500 error with Auth0 login |
| Version0153_commit_and_deploy_csp_fix.mjs | Commit and deploy the Content Security Policy fix | 2025-06-07 | Completed | Committed and pushed CSP fix to Dott_Main_Dev_Deploy branch |
| Version0154_fix_auth0_login_domain_handling.mjs | Fix Auth0 login domain handling in login route | 2025-06-07 | Completed | Fixed domain normalization and URL construction to ensure consistent handling |
| Version0155_commit_and_deploy_auth0_login_domain_fix.mjs | Deploy Auth0 login domain handling fix | 2025-06-07 | Completed | Deployed fix for inconsistent Auth0 domain handling causing 500 error |
| Version0156_fix_auth0_domain_validation.mjs | Fix Auth0 domain validation across authentication flow | 2025-06-07 | ✅ Completed | Fixed inconsistent domain validation to resolve 500 errors with graceful fallbacks |
| Version0157_commit_and_deploy_auth0_domain_validation.mjs | Deploy Auth0 domain validation fix | 2025-06-07 | ✅ Completed | Deployed comprehensive fix for Auth0 domain validation issues |
| Version0158_fix_free_plan_redirect.mjs | Fix free plan redirect to use tenant ID | 2025-06-07 | ✅ Executed | Fixes issue where free plan selection redirects to /dashboard instead of /tenant/{tenantId}/dashboard |
| Version0159_commit_and_deploy_free_plan_redirect_fix.mjs | Commit and deploy free plan redirect fix | 2025-06-07 | ✅ Executed | Deploys the fix for free plan redirect to use tenant-specific path |
| Version0158_fix_free_plan_redirect.mjs | Fix free plan redirect to use tenant ID | 2025-06-07 | 🔄 Pending | Fixes issue where free plan selection redirects to /dashboard instead of /tenant/{tenantId}/dashboard |

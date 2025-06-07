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
|-------------|---------|------|--------|
| Version0130_fix_auth0_user_syntax_error.mjs | Fix syntax errors in create-auth0-user route | 6/7/2025 | Complete |
| Version0129_fix_auth0_login_rewrite_error.mjs | Fix auth0 login route error with rewrite logic | 6/6/2025 | Complete |
| Version0128_commit_and_deploy_auth0_login_fix.mjs | Commit and deploy auth0 login 500 error fix | 6/6/2025 | Complete |
| Version0127_fix_auth0_login_route_500_error.mjs | Fix auth0 login route 500 errors | 6/6/2025 | Complete |
| Version0126_enhance_auth0_session_logging.mjs | Add enhanced logging to auth0 session handling | 6/5/2025 | Complete |
| Version0125_commit_and_deploy_tenant_id_fix.mjs | Commit and deploy tenant ID auth0 session fix | 6/5/2025 | Complete |
| Version0124_fix_tenant_id_auth0_session.mjs | Fix tenant ID storage in auth0 session | 6/5/2025 | Complete |
| Version0123_commit_and_deploy_onboarding_redirect_fix.mjs | Commit and deploy onboarding redirect fix | 6/5/2025 | Complete |
| Version0122_fix_existing_user_onboarding_redirect.mjs | Fix existing user onboarding redirect issues | 6/5/2025 | Complete |
| Version0121_commit_and_deploy_auth0_import_fix.mjs | Commit and deploy auth0 edge import fix | 6/4/2025 | Complete |
| Version0120_fix_auth0_edge_import_onboarding.mjs | Fix auth0 edge import in onboarding service | 6/4/2025 | Complete |
| Version0119_commit_and_deploy_signout_fix.mjs | Commit and deploy signout redirect fix | 6/4/2025 | Complete |
| Version0118_fix_signout_onboarding_redirect.mjs | Fix signout onboarding redirect issues | 6/4/2025 | Complete |
| Version0117_commit_and_deploy_onboarding_status_service.mjs | Commit and deploy onboarding status service | 6/3/2025 | Complete |
| Version0116_implement_robust_onboarding_status_service.mjs | Implement robust onboarding status service | 6/3/2025 | Complete |
| Version0115_commit_and_deploy_auth0_onboarding_redirect_fix.mjs | Commit and deploy auth0 onboarding redirect fix | 6/3/2025 | Complete |
| Version0114_fix_post_auth0_onboarding_redirect.mjs | Fix post-auth0 onboarding redirect | 6/3/2025 | Complete |
| Version0113_enforce_jwt_disable_jwe.mjs | Enforce JWT tokens and disable JWE | 6/2/2025 | Complete |
| Version0112_fix_duplicate_cachedStatus_declaration.mjs | Fix duplicate cachedStatus declaration | 6/2/2025 | Complete |
| Version0111_fix_post_signout_onboarding_redirect_fixed.mjs | Fix post-signout onboarding redirect (fixed version) | 6/2/2025 | Complete |
| Version0111_fix_post_signout_onboarding_redirect.mjs | Fix post-signout onboarding redirect | 6/2/2025 | Failed |

#!/bin/bash
# run_auth0_jwe_domain_fix.sh
# Run the Auth0 JWE token and domain mismatch fix and deploy it
# Created: 2025-06-07

echo "== Starting Auth0 JWE and Domain Mismatch Fix Implementation ==="
echo "This script will fix Auth0 JWE token validation, rate limiting, and domain mismatch issues"

# Run the implementation script
echo "Running Version0142_fix_auth0_jwe_rate_limiting_domain_mismatch.mjs to apply fixes..."
node frontend/pyfactor_next/scripts/Version0142_fix_auth0_jwe_rate_limiting_domain_mismatch.mjs

# Check if the implementation was successful
if [ $? -ne 0 ]; then
  echo "Error: Implementation failed. Please check the logs for details."
  exit 1
fi

# Run the deployment script
echo "Running Version0143_commit_and_deploy_auth0_jwe_domain_fix.mjs to deploy changes..."
node frontend/pyfactor_next/scripts/Version0143_commit_and_deploy_auth0_jwe_domain_fix.mjs

# Check if the deployment was successful
if [ $? -ne 0 ]; then
  echo "Error: Deployment failed. Please check the logs for details."
  exit 1
fi

echo "=== Auth0 JWE and Domain Mismatch Fix Implementation Complete ==="
echo "The fix has been deployed and should resolve the authentication issues."
echo "You can now check the logs to verify the fix is working correctly."

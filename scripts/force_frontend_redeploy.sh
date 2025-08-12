#!/bin/bash

echo "=========================================="
echo "Force Frontend Redeployment Script"
echo "=========================================="
echo ""

# The issue is that the frontend hasn't picked up the Auth0 domain fix yet
# We need to force a redeployment on Render

echo "Current situation:"
echo "- Auth0 logs show NO recent login attempts for support@dottapps.com"
echo "- This means the request isn't reaching Auth0"
echo "- The frontend is still using the old code with auth.dottapps.com"
echo "- We fixed it to use dev-cbyy63jovi6zrcos.us.auth0.com"
echo ""

echo "To force a redeployment:"
echo "1. Go to https://dashboard.render.com"
echo "2. Find the 'dott-front' service"
echo "3. Click 'Manual Deploy' > 'Deploy latest commit'"
echo ""

echo "Alternative - Clear build cache and redeploy:"
echo "1. In Render dashboard for dott-front"
echo "2. Go to Settings"
echo "3. Click 'Clear build cache & deploy'"
echo ""

echo "Or use Render CLI:"
echo "render deploy dott-front --commit main"
echo ""

echo "The fix that needs to be deployed:"
echo "- File: /src/app/api/auth/authenticate/route.js"
echo "- Line 57: Changed from auth.dottapps.com to dev-cbyy63jovi6zrcos.us.auth0.com"
echo ""

echo "After deployment, the authentication flow should be:"
echo "1. User enters email/password"
echo "2. Frontend calls /api/auth/authenticate"
echo "3. That calls Auth0 at dev-cbyy63jovi6zrcos.us.auth0.com/oauth/token"
echo "4. Auth0 validates and returns token"
echo "5. Session is created"
echo ""

echo "You can verify the deployment by checking:"
echo "1. Auth0 logs should show authentication attempts"
echo "2. No more 401 errors without Auth0 being contacted"
echo ""
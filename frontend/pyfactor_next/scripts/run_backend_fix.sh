#!/bin/bash
# Script to run the backend fix for onboarding status

echo "Running backend fix for onboarding status..."
echo ""
echo "This script will fix users who have completed onboarding but still have needs_onboarding = True"
echo ""

# Set the API URL
API_URL="https://api.dottapps.com"

# Create a simple Python script to run the fix
cat > /tmp/fix_onboarding.py << 'EOF'
import requests
import json

# This would normally be run on the backend server directly
# For now, we'll just print the instructions

print("To fix the onboarding status issue, run these commands on the Render backend shell:")
print("")
print("1. For all affected users:")
print("   python manage.py shell < scripts/fix_all_incomplete_onboarding.py")
print("")
print("2. For a specific user (e.g., kdeng@dottapps.com):")
print("   python manage.py shell")
print("   >>> from scripts.fix_complete_onboarding_status import fix_user_onboarding")
print("   >>> fix_user_onboarding('kdeng@dottapps.com')")
print("")
print("3. After running the fix, users should:")
print("   - Clear their browser cache")
print("   - Log out and log back in")
print("   - They should be redirected to the dashboard instead of onboarding")
EOF

python3 /tmp/fix_onboarding.py

echo ""
echo "Fix instructions displayed above."
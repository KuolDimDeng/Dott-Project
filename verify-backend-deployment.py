#!/usr/bin/env python3
"""
Verify if the backend tenant lookup fix is deployed
"""
import requests
import json
from datetime import datetime

print("🔍 Verifying Backend Deployment Status")
print("=" * 50)
print(f"⏰ Check time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print()

# Test endpoints
BACKEND_URL = "https://api.dottapps.com"
HEALTH_URL = f"{BACKEND_URL}/health/"

# Check health endpoint
try:
    response = requests.get(HEALTH_URL, timeout=10)
    print(f"✅ Backend is responding: HTTP {response.status_code}")
except Exception as e:
    print(f"❌ Backend is not responding: {str(e)}")
    exit(1)

print()
print("📋 What to check:")
print("1. SSH into your Render service")
print("2. Check the deployed commit:")
print("   git log -1 --oneline")
print()
print("3. Look for commit 6b885bcc or later:")
print("   'Fix tenant lookup issue - convert user.id to string for CharField comparison'")
print()
print("4. Check the auth0_views.py file:")
print("   grep -n 'user_id_str = str(user.id)' backend/pyfactor/custom_auth/api/views/auth0_views.py")
print()
print("🔍 To verify the fix is working:")
print("1. Clear your browser cache")
print("2. Sign in with kdeng@dottapps.com")
print("3. Check the backend logs - you should see:")
print("   '🔥 [USER_PROFILE] Tenant lookup by owner_id ('17') result: <Tenant instance>'")
print("   NOT: 'result: None'")
print()
print("💡 If the fix is NOT deployed:")
print("1. Go to https://dashboard.render.com/")
print("2. Find your backend service (api.dottapps.com)")
print("3. Click 'Manual Deploy' > 'Deploy latest commit'")
print("4. Wait for deployment to complete (~5-10 minutes)")
print()
print("The fix converts user.id to string before querying the Tenant table")
print("This resolves the type mismatch between integer user.id and CharField owner_id")
#!/usr/bin/env python3
"""
Test the session API for support@dottapps.com on staging
"""

import requests
import json

# Staging URL
BASE_URL = "https://staging.dottapps.com"

# Test credentials
email = "support@dottapps.com"
password = input("Enter password for support@dottapps.com: ")

# Create session
print("\n1. Creating session...")
session_response = requests.post(
    f"{BASE_URL}/api/auth/session-v2",
    json={"email": email, "password": password},
    headers={"Content-Type": "application/json"}
)

if session_response.status_code == 200:
    print("✓ Session created successfully")
    session_data = session_response.json()
    
    # Extract session cookie
    cookies = session_response.cookies
    
    print("\n2. Session Data:")
    print(json.dumps(session_data, indent=2))
    
    # Check specific fields
    print("\n3. Key Fields Check:")
    user = session_data.get('user', {})
    print(f"  - Email: {user.get('email')}")
    print(f"  - Role: {user.get('role', 'NOT SET')}")
    print(f"  - Has Business: {user.get('has_business', False)}")
    print(f"  - Business Name: {user.get('business_name', 'NOT SET')}")
    print(f"  - Business ID: {user.get('business_id', 'NOT SET')}")
    print(f"  - Tenant ID: {user.get('tenant_id', 'NOT SET')}")
    
    # Test /api/users/me endpoint
    print("\n4. Testing /api/users/me endpoint...")
    me_response = requests.get(
        f"{BASE_URL}/api/users/me/",
        cookies=cookies
    )
    
    if me_response.status_code == 200:
        me_data = me_response.json()
        print("✓ /api/users/me returned successfully")
        print(f"  - Role: {me_data.get('role', 'NOT SET')}")
        print(f"  - Has Business: {me_data.get('has_business', False)}")
        print(f"  - Business Name: {me_data.get('business_name', 'NOT SET')}")
    else:
        print(f"✗ /api/users/me failed: {me_response.status_code}")
        print(me_response.text)
        
else:
    print(f"✗ Session creation failed: {session_response.status_code}")
    print(session_response.text)

print("\n" + "="*60)
print("DIAGNOSIS:")
print("="*60)

issues = []
if user.get('role') != 'OWNER':
    issues.append(f"Role is not OWNER (current: {user.get('role', 'NOT SET')})")
if not user.get('has_business'):
    issues.append("has_business flag is False")
if not user.get('business_name'):
    issues.append("business_name is not set")

if issues:
    print("Issues found:")
    for issue in issues:
        print(f"  - {issue}")
    print("\nTo fix these issues, run the following on the staging server:")
    print("  python manage.py shell")
    print("  exec(open('scripts/fix_support_user_complete.py').read())")
else:
    print("✓ No issues found! User is properly configured.")
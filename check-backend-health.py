#!/usr/bin/env python3
"""
Comprehensive backend health check
"""
import requests
import json
from datetime import datetime

print("🏥 Backend Health Check")
print("=" * 50)
print(f"⏰ Check time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print()

BACKEND_URL = "https://api.dottapps.com"

# Test various endpoints
endpoints = [
    ("/health/", "Health Check"),
    ("/api/", "API Root"),
    ("/admin/", "Admin Interface"),
]

all_good = True

for endpoint, name in endpoints:
    url = f"{BACKEND_URL}{endpoint}"
    try:
        response = requests.get(url, timeout=10, allow_redirects=True)
        status_code = response.status_code
        
        if endpoint == "/health/":
            if status_code == 200:
                print(f"✅ {name}: OK (HTTP {status_code})")
                try:
                    data = response.json()
                    print(f"   Response: {json.dumps(data, indent=2)}")
                except:
                    print(f"   Response: {response.text[:100]}")
            else:
                print(f"⚠️  {name}: HTTP {status_code}")
                all_good = False
        elif endpoint == "/api/":
            if status_code in [200, 401, 403]:
                print(f"✅ {name}: Accessible (HTTP {status_code})")
            else:
                print(f"⚠️  {name}: HTTP {status_code}")
                all_good = False
        elif endpoint == "/admin/":
            if status_code in [200, 301, 302, 401]:
                print(f"✅ {name}: Accessible (HTTP {status_code})")
            else:
                print(f"⚠️  {name}: HTTP {status_code}")
                all_good = False
                
    except requests.exceptions.Timeout:
        print(f"❌ {name}: Timeout")
        all_good = False
    except requests.exceptions.ConnectionError:
        print(f"❌ {name}: Connection Error")
        all_good = False
    except Exception as e:
        print(f"❌ {name}: {type(e).__name__}: {str(e)}")
        all_good = False

print()

# Check CORS headers
print("🌐 CORS Configuration:")
try:
    headers = {
        'Origin': 'https://app.dottapps.com',
        'Content-Type': 'application/json'
    }
    response = requests.options(f"{BACKEND_URL}/api/users/me", headers=headers, timeout=10)
    
    cors_headers = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin', 'Not set'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods', 'Not set'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers', 'Not set'),
    }
    
    for header, value in cors_headers.items():
        if value != 'Not set':
            print(f"✅ {header}: {value}")
        else:
            print(f"⚠️  {header}: {value}")
            
except Exception as e:
    print(f"❌ CORS check failed: {str(e)}")

print()

# Summary
if all_good:
    print("✅ Backend appears to be running correctly!")
else:
    print("⚠️  Some issues detected with the backend")
    
print()
print("📋 Additional checks to perform:")
print("1. Check Render dashboard for deployment status")
print("2. View recent logs for any errors")
print("3. Verify database connectivity")
print("4. Test authentication endpoints")
print()
print("🔍 To check if the tenant lookup fix is deployed:")
print("   Look for 'user_id_str = str(user.id)' in the code")
print("   Or check for commit 6b885bcc or later")
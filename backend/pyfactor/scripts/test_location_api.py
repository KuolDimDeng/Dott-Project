#!/usr/bin/env python3
"""
Simple script to test the location migration API endpoint
"""

import requests
import json
import sys
import os

def test_migration_endpoint(base_url="https://api.dottapps.com", auth_token=None):
    """Test the location migration status endpoint"""
    
    print("🔍 Testing Location Migration API Endpoint")
    print("=" * 50)
    
    endpoint = f"{base_url}/api/inventory/check/location-migration/"
    
    headers = {
        'Content-Type': 'application/json',
    }
    
    if auth_token:
        headers['Authorization'] = f'Bearer {auth_token}'
    
    print(f"📡 Making request to: {endpoint}")
    print(f"🔑 Using auth token: {'Yes' if auth_token else 'No'}")
    
    try:
        response = requests.get(endpoint, headers=headers, timeout=30)
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📋 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS - Migration Status:")
            print(json.dumps(data, indent=2))
            
            status = data.get('status')
            if status == 'ok':
                print("🎉 Migration is fully applied!")
            elif status == 'issues_detected':
                print("⚠️  Issues detected with migration:")
                for rec in data.get('recommendations', []):
                    if rec:
                        print(f"   - {rec}")
            else:
                print(f"❓ Unknown status: {status}")
                
        elif response.status_code == 401:
            print("❌ AUTHENTICATION REQUIRED")
            print("   Please provide a valid auth token")
            
        elif response.status_code == 403:
            print("❌ ACCESS FORBIDDEN")
            print("   Your token may not have the required permissions")
            
        elif response.status_code == 404:
            print("❌ ENDPOINT NOT FOUND")
            print("   The migration check endpoint may not be deployed yet")
            
        else:
            print(f"❌ ERROR - Status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR")
        print(f"   Cannot connect to {base_url}")
        print("   Check if the server is running and accessible")
        
    except requests.exceptions.Timeout:
        print("❌ TIMEOUT")
        print("   Request timed out after 30 seconds")
        
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {str(e)}")

def test_local_endpoint():
    """Test the local development endpoint"""
    print("🏠 Testing local development endpoint...")
    test_migration_endpoint("http://localhost:8000")

def test_production_endpoint():
    """Test the production endpoint"""
    print("🌐 Testing production endpoint...")
    
    # You can set this environment variable with your auth token
    auth_token = os.environ.get('DOTT_AUTH_TOKEN')
    if not auth_token:
        print("💡 TIP: Set DOTT_AUTH_TOKEN environment variable for authenticated requests")
    
    test_migration_endpoint("https://api.dottapps.com", auth_token)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        if sys.argv[1] == 'local':
            test_local_endpoint()
        elif sys.argv[1] == 'production' or sys.argv[1] == 'prod':
            test_production_endpoint()
        else:
            print("Usage: python test_location_api.py [local|production]")
            print("  local      - Test local development server")
            print("  production - Test production API")
            sys.exit(1)
    else:
        print("Choose test environment:")
        print("1. Local development (localhost:8000)")
        print("2. Production (api.dottapps.com)")
        
        choice = input("Enter choice (1 or 2): ").strip()
        
        if choice == '1':
            test_local_endpoint()
        elif choice == '2':
            test_production_endpoint()
        else:
            print("Invalid choice")
            sys.exit(1)
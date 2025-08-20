#!/usr/bin/env python3
"""
Test the sales API endpoint directly
"""

import requests
import json
from datetime import datetime

def test_sales_api():
    """Test the sales API endpoint"""
    print("\n" + "="*60)
    print("TESTING SALES API ENDPOINTS")
    print(f"Timestamp: {datetime.now()}")
    print("="*60)
    
    # Test both staging and production
    environments = {
        "Production": "https://api.dottapps.com",
        "Staging": "https://staging-api.dottapps.com"  # If exists
    }
    
    for env_name, api_url in environments.items():
        print(f"\n🌐 Testing {env_name}: {api_url}")
        print("-" * 40)
        
        # 1. Test health/status endpoint
        try:
            health_url = f"{api_url}/health"
            print(f"\n1. Health Check: GET {health_url}")
            response = requests.get(health_url, timeout=10)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"   Response: {json.dumps(data, indent=2)[:200]}")
                except:
                    print(f"   Response (text): {response.text[:200]}")
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Connection failed - API might not exist at this URL")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        # 2. Test sales-data endpoint (without auth)
        try:
            sales_url = f"{api_url}/api/analytics/sales-data?time_range=1"
            print(f"\n2. Sales Data Endpoint: GET {sales_url}")
            print("   (Testing without authentication)")
            response = requests.get(sales_url, timeout=10)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 401:
                print("   ✓ Endpoint requires authentication (expected)")
            elif response.status_code == 200:
                print("   ⚠️ WARNING: Endpoint accessible without auth!")
                data = response.json()
                print(f"   Data keys: {list(data.keys())}")
            elif response.status_code == 404:
                print("   ❌ Endpoint not found")
            else:
                print(f"   Response: {response.text[:200]}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        # 3. Test with a dummy session cookie
        try:
            print(f"\n3. Sales Data with Dummy Auth:")
            headers = {
                'Cookie': 'sid=dummy_session_for_testing',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
            response = requests.get(sales_url, headers=headers, timeout=10)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 401:
                print("   ✓ Invalid session rejected (expected)")
            elif response.status_code == 200:
                print("   ⚠️ Dummy session accepted (unexpected)")
            else:
                print(f"   Response preview: {response.text[:200]}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        # 4. Check response headers
        try:
            print(f"\n4. Response Headers Analysis:")
            response = requests.head(f"{api_url}/api/analytics/sales-data", timeout=10)
            important_headers = ['Server', 'X-Powered-By', 'Access-Control-Allow-Origin', 'Content-Type']
            for header in important_headers:
                value = response.headers.get(header, 'Not Set')
                print(f"   {header}: {value}")
        except Exception as e:
            print(f"   ❌ Error: {e}")

def test_frontend_proxy():
    """Test the frontend proxy endpoints"""
    print("\n" + "="*60)
    print("TESTING FRONTEND PROXY")
    print("="*60)
    
    frontend_urls = {
        "Production": "https://app.dottapps.com",
        "Production Alt": "https://dottapps.com",
    }
    
    for env_name, base_url in frontend_urls.items():
        print(f"\n🌐 Testing {env_name}: {base_url}")
        print("-" * 40)
        
        try:
            # Test the frontend proxy to backend
            proxy_url = f"{base_url}/api/analytics/sales-data?time_range=1"
            print(f"   Proxy URL: {proxy_url}")
            response = requests.get(proxy_url, timeout=10, allow_redirects=False)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 401:
                print("   ✓ Requires authentication")
            elif response.status_code in [301, 302, 307, 308]:
                print(f"   → Redirects to: {response.headers.get('Location', 'Unknown')}")
            elif response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'json' in content_type:
                    print("   ✓ Returns JSON data")
                else:
                    print(f"   Content-Type: {content_type}")
        except Exception as e:
            print(f"   ❌ Error: {e}")

def main():
    test_sales_api()
    test_frontend_proxy()
    
    print("\n" + "="*60)
    print("API TESTING COMPLETE")
    print("="*60)
    print("\nSUMMARY:")
    print("- Check if api.dottapps.com is responding")
    print("- Verify authentication is required")
    print("- Confirm frontend proxy is working")
    print("- Look for any error messages in responses")

if __name__ == "__main__":
    main()
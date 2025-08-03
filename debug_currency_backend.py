#!/usr/bin/env python3
"""
Debug script to test currency API backend directly
"""
import requests
import json
from datetime import datetime

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

def print_result(success, message):
    color = GREEN if success else RED
    symbol = "✅" if success else "❌"
    print(f"{color}{symbol} {message}{RESET}")

def test_backend_health():
    """Test if backend is reachable"""
    print_header("1. Testing Backend Health")
    
    urls = [
        "https://api.dottapps.com/health/",
        "https://api.dottapps.com/api/currency/health",
        "https://api.dottapps.com/api/currency/preferences?test=1"
    ]
    
    for url in urls:
        try:
            print(f"\n{YELLOW}Testing: {url}{RESET}")
            response = requests.get(url, timeout=10)
            print(f"Status: {response.status_code}")
            print(f"Headers: {dict(response.headers)}")
            
            if response.headers.get('content-type', '').startswith('application/json'):
                print(f"Response: {json.dumps(response.json(), indent=2)}")
            else:
                print(f"Response (first 500 chars): {response.text[:500]}")
                
            print_result(response.status_code == 200, f"Status {response.status_code}")
            
        except requests.exceptions.RequestException as e:
            print_result(False, f"Error: {str(e)}")

def test_direct_backend_auth():
    """Test backend with a mock session"""
    print_header("2. Testing Direct Backend Auth")
    
    # This would need a valid session ID to work
    print(f"{YELLOW}Note: This test requires a valid session ID{RESET}")
    print("To get a session ID:")
    print("1. Log in to the app")
    print("2. Open browser DevTools")
    print("3. Go to Application/Storage > Cookies")
    print("4. Find the 'sid' cookie value")
    
    # Example with placeholder
    session_id = "YOUR_SESSION_ID_HERE"
    
    if session_id != "YOUR_SESSION_ID_HERE":
        headers = {
            'Cookie': f'sid={session_id}',
            'Accept': 'application/json'
        }
        
        try:
            response = requests.get(
                "https://api.dottapps.com/api/currency/preferences",
                headers=headers,
                timeout=10
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                print(f"Response: {json.dumps(response.json(), indent=2)}")
                print_result(True, "Authentication successful")
            else:
                print_result(False, f"Authentication failed: {response.status_code}")
        except Exception as e:
            print_result(False, f"Error: {str(e)}")
    else:
        print(f"{RED}⚠️  Please set a valid session ID{RESET}")

def test_cloudflare_headers():
    """Check Cloudflare specific headers"""
    print_header("3. Testing Cloudflare Headers")
    
    try:
        response = requests.get("https://api.dottapps.com/health/", timeout=10)
        
        cf_headers = {k: v for k, v in response.headers.items() if 'cf-' in k.lower()}
        print("Cloudflare headers:")
        for k, v in cf_headers.items():
            print(f"  {k}: {v}")
            
        if 'cf-ray' in response.headers:
            print_result(True, "Cloudflare proxy detected")
        else:
            print_result(False, "No Cloudflare headers found")
            
    except Exception as e:
        print_result(False, f"Error: {str(e)}")

def main():
    print(f"{BLUE}Currency API Backend Debug Script{RESET}")
    print(f"Time: {datetime.now().isoformat()}")
    
    test_backend_health()
    test_direct_backend_auth()
    test_cloudflare_headers()
    
    print_header("Debug Summary")
    print("Common issues:")
    print("1. 502 Bad Gateway: Backend service is down or unreachable")
    print("2. 401 Unauthorized: Session cookie missing or invalid")
    print("3. 503 Service Unavailable: Backend overloaded or in maintenance")
    print("4. Timeout: Network issues or slow backend response")
    
    print(f"\n{YELLOW}Next steps:{RESET}")
    print("1. Check backend logs: render logs dott-api")
    print("2. Verify backend is deployed and running")
    print("3. Check Cloudflare settings for api.dottapps.com")
    print("4. Test with a valid session cookie")

if __name__ == "__main__":
    main()
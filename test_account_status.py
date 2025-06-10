#!/usr/bin/env python3
"""
Test if we can check the account status via the /api/test/auth endpoint
"""
import requests
import json

def test_account_status():
    """Test the account status using the debug endpoint"""
    
    print("🔍 TESTING ACCOUNT STATUS")
    print("=" * 50)
    
    # Test the auth endpoint we created
    auth_url = "https://dottapps.com/api/test/auth"
    
    print(f"Testing: {auth_url}")
    print("This endpoint will show us:")
    print("- Whether the user is authenticated")
    print("- If we can get an access token")
    print("- If the backend accepts the token")
    print()
    
    try:
        response = requests.get(auth_url)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\nResponse:")
            print(json.dumps(data, indent=2))
            
            if data.get('authenticated'):
                print("\n✅ User is authenticated")
                print(f"Email: {data['session']['user']['email']}")
                
                if data.get('accessToken', {}).get('retrieved'):
                    print("✅ Access token retrieved successfully")
                    
                    # Check backend test
                    backend_test = data.get('backendTest')
                    if backend_test:
                        if backend_test.get('ok'):
                            print("✅ Backend accepts the token")
                        else:
                            print(f"❌ Backend rejected token: {backend_test.get('status')}")
                            if backend_test.get('data'):
                                print(f"Error: {backend_test.get('data')}")
                else:
                    print("❌ Failed to get access token")
                    error = data.get('accessToken', {}).get('error')
                    if error:
                        print(f"Error: {error}")
            else:
                print("❌ User not authenticated")
        else:
            print(f"❌ Request failed: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("CONCLUSION:")
    print("If the user is authenticated and can get tokens, then the account")
    print("was NOT properly closed. The 403 error prevented the soft deletion.")

if __name__ == "__main__":
    test_account_status()
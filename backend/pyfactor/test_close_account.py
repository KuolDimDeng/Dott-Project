#!/usr/bin/env python
"""
Test script to check the close account endpoint directly
"""
import requests
import json

def test_close_account():
    """Test the close account endpoint"""
    
    # Configure the test
    api_url = "https://api.dottapps.com"
    endpoint = f"{api_url}/api/users/close-account/"
    
    # You need a valid Auth0 access token
    # This would normally come from the frontend
    access_token = "YOUR_ACCESS_TOKEN_HERE"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}",
        "X-User-Email": "kdeng@dottapps.com",
        "X-User-Sub": "auth0|684657d9b7d4a27988b1bbf6",
        "X-Tenant-ID": "f7633a43-97f6-4b98-923e-d0c396ac24a4"
    }
    
    data = {
        "reason": "Testing account closure",
        "feedback": "Just testing if the endpoint works",
        "user_email": "kdeng@dottapps.com",
        "user_sub": "auth0|684657d9b7d4a27988b1bbf6"
    }
    
    print(f"Testing close account endpoint: {endpoint}")
    print(f"Headers: {json.dumps(headers, indent=2)}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(endpoint, headers=headers, json=data)
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response Data: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response Text: {response.text}")
            
        if response.status_code == 403:
            print("\n❌ 403 FORBIDDEN - Authentication/Authorization issue")
            print("Possible causes:")
            print("1. Invalid or expired access token")
            print("2. Token doesn't have the right audience/scope")
            print("3. Backend authentication middleware is blocking the request")
            print("4. User not properly authenticated on backend")
            
    except Exception as e:
        print(f"\nError: {str(e)}")

if __name__ == "__main__":
    test_close_account()
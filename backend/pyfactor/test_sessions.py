#!/usr/bin/env python
"""
Test script for session management endpoints
Run this after starting the Django server
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"

# Test Auth0 token (you'll need to replace this with a real token)
# You can get this from the frontend after logging in
AUTH0_TOKEN = "YOUR_AUTH0_TOKEN_HERE"

def test_create_session():
    """Test creating a new session"""
    print("\n1. Testing session creation...")
    
    url = f"{API_URL}/sessions/create/"
    headers = {
        "Authorization": f"Bearer {AUTH0_TOKEN}",
        "Content-Type": "application/json"
    }
    data = {
        "needs_onboarding": True,
        "subscription_plan": "free"
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            session_data = response.json()
            print(f"✅ Session created successfully!")
            print(f"Session Token: {session_data.get('session_token')}")
            print(f"Expires At: {session_data.get('expires_at')}")
            return session_data.get('session_token')
        else:
            print(f"❌ Failed to create session: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

def test_get_session(session_token):
    """Test retrieving current session"""
    print("\n2. Testing session retrieval...")
    
    url = f"{API_URL}/sessions/current/"
    headers = {
        "Authorization": f"Session {session_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            session_data = response.json()
            print(f"✅ Session retrieved successfully!")
            print(f"User: {session_data.get('user', {}).get('email')}")
            print(f"Tenant: {session_data.get('tenant', {}).get('name') if session_data.get('tenant') else 'None'}")
            print(f"Needs Onboarding: {session_data.get('needs_onboarding')}")
        else:
            print(f"❌ Failed to get session: {response.text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_update_session(session_token):
    """Test updating session data"""
    print("\n3. Testing session update...")
    
    url = f"{API_URL}/sessions/current/"
    headers = {
        "Authorization": f"Session {session_token}",
        "Content-Type": "application/json"
    }
    data = {
        "needs_onboarding": False,
        "onboarding_completed": True,
        "subscription_plan": "professional"
    }
    
    try:
        response = requests.patch(url, headers=headers, json=data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ Session updated successfully!")
        else:
            print(f"❌ Failed to update session: {response.text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_refresh_session(session_token):
    """Test refreshing session expiration"""
    print("\n4. Testing session refresh...")
    
    url = f"{API_URL}/sessions/refresh/"
    headers = {
        "Authorization": f"Session {session_token}",
        "Content-Type": "application/json"
    }
    data = {
        "hours": 48  # Extend for 48 hours
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Session refreshed successfully!")
            print(f"New expiration: {data.get('expires_at')}")
        else:
            print(f"❌ Failed to refresh session: {response.text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_list_sessions(session_token):
    """Test listing all user sessions"""
    print("\n5. Testing session list...")
    
    url = f"{API_URL}/sessions/"
    headers = {
        "Authorization": f"Session {session_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Sessions listed successfully!")
            print(f"Total sessions: {data.get('count')}")
            for idx, session in enumerate(data.get('sessions', [])):
                print(f"  Session {idx + 1}: Created {session.get('created_at')}")
        else:
            print(f"❌ Failed to list sessions: {response.text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_delete_session(session_token):
    """Test deleting current session"""
    print("\n6. Testing session deletion...")
    
    url = f"{API_URL}/sessions/current/"
    headers = {
        "Authorization": f"Session {session_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.delete(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ Session deleted successfully!")
        else:
            print(f"❌ Failed to delete session: {response.text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def main():
    """Run all tests"""
    print("=" * 50)
    print("Session Management API Tests")
    print("=" * 50)
    
    if AUTH0_TOKEN == "YOUR_AUTH0_TOKEN_HERE":
        print("\n⚠️  Please update AUTH0_TOKEN with a real token!")
        print("You can get this from the browser after logging in.")
        print("Look for the Authorization header in network requests.")
        return
    
    # Create a session
    session_token = test_create_session()
    
    if session_token:
        # Test other endpoints
        test_get_session(session_token)
        test_update_session(session_token)
        test_refresh_session(session_token)
        test_list_sessions(session_token)
        
        # Clean up
        input("\nPress Enter to delete the session...")
        test_delete_session(session_token)
    
    print("\n✅ Tests completed!")

if __name__ == "__main__":
    main()
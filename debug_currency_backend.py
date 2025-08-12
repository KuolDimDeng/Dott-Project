#!/usr/bin/env python3
"""
Debug script to test currency API backend directly
"""
import requests
import json
import sys

# Backend URL
BASE_URL = "https://api.dottapps.com"

def test_currency_endpoints():
    print("Testing Currency API Backend")
    print("=" * 50)
    
    # Test health endpoint
    print("\n1. Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/users/api/currency/health", timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        print(f"   Body: {response.text[:200]}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test preferences without auth
    print("\n2. Testing preferences endpoint (no auth)...")
    try:
        response = requests.get(f"{BASE_URL}/api/users/api/currency/preferences", timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Content-Type: {response.headers.get('content-type', 'Not set')}")
        print(f"   Body: {response.text[:200]}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test Django admin to see if backend is up
    print("\n3. Testing Django admin (backend health check)...")
    try:
        response = requests.get(f"{BASE_URL}/admin/", timeout=10, allow_redirects=False)
        print(f"   Status: {response.status_code}")
        print(f"   Redirect: {response.headers.get('location', 'No redirect')}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test root API endpoint
    print("\n4. Testing root API endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/", timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Body: {response.text[:200]}")
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    test_currency_endpoints()
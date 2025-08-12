#!/usr/bin/env python3
"""
Quick Currency Issue Test
Tests the specific currency update issue mentioned by user
"""

import requests
import json
import sys
from datetime import datetime

def log(message, level="INFO"):
    """Log with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{timestamp}] [{level}] {message}")

def test_currency_diagnostic():
    """Test the diagnostic endpoint that should work without auth"""
    log("🔍 Testing currency diagnostic endpoint...")
    
    try:
        # Test the diagnostic endpoint first
        response = requests.get(
            "https://api.dottapps.com/api/currency/diagnostic",
            headers={
                'Accept': 'application/json',
                'User-Agent': 'CurrencyDiagnosticTest/1.0'
            },
            timeout=30
        )
        
        log(f"Status Code: {response.status_code}")
        log(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                log("✅ SUCCESS: Diagnostic endpoint working")
                log("Response data:")
                print(json.dumps(data, indent=2, default=str))
                return True
            except json.JSONDecodeError as e:
                log(f"❌ JSON decode error: {e}")
                log(f"Raw response: {response.text[:500]}...")
                return False
        elif response.status_code == 401:
            log("❌ AUTHENTICATION REQUIRED")
            log("The diagnostic endpoint requires authentication")
            log("This means the session is not being passed correctly")
            return False
        elif response.status_code == 404:
            log("❌ ENDPOINT NOT FOUND")
            log("The diagnostic endpoint may not be properly configured in URLs")
            return False
        else:
            log(f"❌ UNEXPECTED STATUS: {response.status_code}")
            log(f"Response: {response.text[:500]}...")
            return False
            
    except requests.exceptions.Timeout:
        log("❌ REQUEST TIMEOUT")
        log("The API request timed out after 30 seconds")
        return False
    except requests.exceptions.ConnectionError as e:
        log(f"❌ CONNECTION ERROR: {e}")
        log("Cannot connect to the API server")
        return False
    except Exception as e:
        log(f"❌ UNEXPECTED ERROR: {e}")
        return False

def test_currency_preferences():
    """Test the currency preferences endpoint"""
    log("💰 Testing currency preferences endpoint...")
    
    try:
        # Test GET first
        response = requests.get(
            "https://api.dottapps.com/api/currency/preferences/",
            headers={
                'Accept': 'application/json',
                'User-Agent': 'CurrencyTest/1.0'
            },
            timeout=30
        )
        
        log(f"GET Status Code: {response.status_code}")
        
        if response.status_code == 401:
            log("❌ AUTHENTICATION REQUIRED for preferences")
            log("This is expected - the endpoint requires a valid session")
            return False
        elif response.status_code == 200:
            try:
                data = response.json()
                log("✅ GET SUCCESS (unexpected - should require auth)")
                print(json.dumps(data, indent=2, default=str))
                return True
            except json.JSONDecodeError:
                log("❌ Invalid JSON response")
                return False
        else:
            log(f"❌ Unexpected status: {response.status_code}")
            log(f"Response: {response.text[:500]}...")
            return False
            
    except Exception as e:
        log(f"❌ Error testing preferences: {e}")
        return False

def test_frontend_proxy():
    """Test the frontend proxy endpoint"""
    log("🌐 Testing frontend proxy endpoint...")
    
    try:
        response = requests.get(
            "https://app.dottapps.com/api/currency/preferences",
            headers={
                'Accept': 'application/json',
                'User-Agent': 'CurrencyTest/1.0'
            },
            timeout=30
        )
        
        log(f"Frontend Status Code: {response.status_code}")
        
        if response.status_code == 401:
            log("❌ AUTHENTICATION REQUIRED for frontend proxy")
            log("This is expected - user needs to be logged in")
            return False
        elif response.status_code == 200:
            try:
                data = response.json()
                log("✅ Frontend proxy success (unexpected without auth)")
                print(json.dumps(data, indent=2, default=str))
                return True
            except json.JSONDecodeError:
                log("❌ Invalid JSON from frontend")
                return False
        else:
            log(f"❌ Frontend status: {response.status_code}")
            log(f"Response: {response.text[:200]}...")
            return False
            
    except Exception as e:
        log(f"❌ Error testing frontend: {e}")
        return False

def main():
    """Main test function"""
    log("🚀 STARTING CURRENCY ISSUE DIAGNOSTIC")
    log("=" * 60)
    print()
    
    # Test 1: Diagnostic endpoint
    diagnostic_ok = test_currency_diagnostic()
    print()
    
    # Test 2: Currency preferences
    preferences_ok = test_currency_preferences()
    print()
    
    # Test 3: Frontend proxy
    frontend_ok = test_frontend_proxy()
    print()
    
    # Summary
    log("=" * 60)
    log("📋 TEST SUMMARY")
    log(f"   Diagnostic endpoint: {'✅ PASS' if diagnostic_ok else '❌ FAIL'}")
    log(f"   Preferences endpoint: {'✅ PASS' if preferences_ok else '❌ FAIL (expected)'}")
    log(f"   Frontend proxy: {'✅ PASS' if frontend_ok else '❌ FAIL (expected)'}")
    
    if diagnostic_ok:
        log("🎯 NEXT STEPS:")
        log("   1. The diagnostic endpoint is working")
        log("   2. You need to be authenticated to test currency updates")
        log("   3. Run the database diagnostic script next:")
        log("      cd /Users/kuoldeng/projectx/backend/pyfactor")
        log("      python scripts/test_currency_diagnostic.py")
    else:
        log("⚠️  ISSUE FOUND:")
        log("   The diagnostic endpoint is not working")
        log("   This suggests there may be:")
        log("   - URL routing issues")
        log("   - Authentication problems")
        log("   - Server configuration problems")
    
    print()
    log("🏁 DIAGNOSTIC COMPLETE")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Fixed Currency Test - Using correct URL paths
"""

import requests
import json
from datetime import datetime

def log(message, level="INFO"):
    """Log with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{timestamp}] [{level}] {message}")

def test_diagnostic_endpoint():
    """Test the diagnostic endpoint with correct URL"""
    log("🔍 Testing currency diagnostic endpoint...")
    
    try:
        # The diagnostic endpoint should be at /api/currency/diagnostic/
        response = requests.get(
            "https://api.dottapps.com/api/currency/diagnostic/",
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
            return False
        elif response.status_code == 403:
            log("❌ FORBIDDEN ACCESS")
            log("The diagnostic endpoint is forbidden")
            return False
        elif response.status_code == 404:
            log("❌ ENDPOINT NOT FOUND")
            log("The diagnostic endpoint URL may be incorrect")
            return False
        else:
            log(f"❌ UNEXPECTED STATUS: {response.status_code}")
            log(f"Response: {response.text[:500]}...")
            return False
            
    except Exception as e:
        log(f"❌ Error: {e}")
        return False

def test_public_endpoint():
    """Test the public test endpoint"""
    log("🌍 Testing public test endpoint...")
    
    try:
        response = requests.get(
            "https://api.dottapps.com/api/currency/test-public/",
            headers={
                'Accept': 'application/json',
                'User-Agent': 'CurrencyTest/1.0'
            },
            timeout=30
        )
        
        log(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                log("✅ SUCCESS: Public endpoint working")
                print(json.dumps(data, indent=2, default=str))
                return True
            except json.JSONDecodeError as e:
                log(f"❌ JSON decode error: {e}")
                log(f"Raw response: {response.text[:500]}...")
                return False
        else:
            log(f"❌ Status: {response.status_code}")
            log(f"Response: {response.text[:500]}...")
            return False
            
    except Exception as e:
        log(f"❌ Error: {e}")
        return False

def test_currency_list():
    """Test currency list endpoint"""
    log("📋 Testing currency list endpoint...")
    
    try:
        response = requests.get(
            "https://api.dottapps.com/api/currency/list/",
            headers={
                'Accept': 'application/json',
                'User-Agent': 'CurrencyTest/1.0'
            },
            timeout=30
        )
        
        log(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                log("✅ SUCCESS: Currency list working")
                log(f"Total currencies: {data.get('total', 'unknown')}")
                return True
            except json.JSONDecodeError as e:
                log(f"❌ JSON decode error: {e}")
                return False
        elif response.status_code == 401:
            log("❌ Authentication required for currency list")
            return False
        else:
            log(f"❌ Status: {response.status_code}")
            log(f"Response: {response.text[:300]}...")
            return False
            
    except Exception as e:
        log(f"❌ Error: {e}")
        return False

def main():
    """Main test function"""
    log("🚀 TESTING CURRENCY ENDPOINTS WITH CORRECT URLS")
    log("=" * 60)
    print()
    
    # Test 1: Public endpoint (should work without auth)
    public_ok = test_public_endpoint()
    print()
    
    # Test 2: Diagnostic endpoint 
    diagnostic_ok = test_diagnostic_endpoint()
    print()
    
    # Test 3: Currency list
    list_ok = test_currency_list()
    print()
    
    log("=" * 60)
    log("📋 RESULTS:")
    log(f"   Public endpoint: {'✅ PASS' if public_ok else '❌ FAIL'}")
    log(f"   Diagnostic endpoint: {'✅ PASS' if diagnostic_ok else '❌ FAIL'}")
    log(f"   Currency list: {'✅ PASS' if list_ok else '❌ FAIL'}")
    
    if public_ok and not diagnostic_ok:
        log("🔍 ANALYSIS:")
        log("   - Public endpoint works (routing is correct)")
        log("   - Diagnostic endpoint fails (authentication issue)")
        log("   - The diagnostic endpoint has @permission_classes([IsAuthenticated])")
        log("   - This might be the bug - diagnostic should work without auth")
    
    print()
    log("🏁 TEST COMPLETE")

if __name__ == "__main__":
    main()
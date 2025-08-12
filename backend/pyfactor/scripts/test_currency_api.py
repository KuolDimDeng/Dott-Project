#!/usr/bin/env python3
"""
Currency API Test Script
Tests currency API endpoints with authentication
"""

import requests
import json
from datetime import datetime

class CurrencyAPITester:
    def __init__(self):
        self.base_url = "https://api.dottapps.com"
        self.frontend_url = "https://app.dottapps.com"
        self.session = requests.Session()
        
        # Set proper headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'CurrencyDiagnosticScript/1.0',
            'Accept': 'application/json',
        })
        
    def log(self, message, level="INFO"):
        """Log with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def test_diagnostic_endpoint(self):
        """Test the diagnostic endpoint"""
        self.log("=== TESTING DIAGNOSTIC ENDPOINT ===")
        
        try:
            url = f"{self.base_url}/api/currency/diagnostic"
            self.log(f"Making request to: {url}")
            
            response = self.session.get(url)
            self.log(f"Status: {response.status_code}")
            self.log(f"Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.log("✅ Diagnostic endpoint success")
                    self.log(f"Response: {json.dumps(data, indent=2, default=str)}")
                    return True
                except Exception as e:
                    self.log(f"❌ JSON decode error: {str(e)}")
                    self.log(f"Raw response: {response.text[:1000]}")
                    return False
            else:
                self.log(f"❌ HTTP {response.status_code}")
                self.log(f"Response: {response.text[:1000]}")
                return False
                
        except Exception as e:
            self.log(f"❌ Request error: {str(e)}", "ERROR")
            return False
    
    def test_currency_preferences_get(self):
        """Test GET currency preferences"""
        self.log("=== TESTING GET CURRENCY PREFERENCES ===")
        
        try:
            url = f"{self.base_url}/api/currency/preferences/"
            self.log(f"Making GET request to: {url}")
            
            response = self.session.get(url)
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.log("✅ GET preferences success")
                    self.log(f"Response: {json.dumps(data, indent=2, default=str)}")
                    return data
                except Exception as e:
                    self.log(f"❌ JSON decode error: {str(e)}")
                    self.log(f"Raw response: {response.text[:1000]}")
                    return None
            else:
                self.log(f"❌ HTTP {response.status_code}")
                self.log(f"Response: {response.text[:1000]}")
                return None
                
        except Exception as e:
            self.log(f"❌ Request error: {str(e)}", "ERROR")
            return None
    
    def test_currency_preferences_update(self):
        """Test PUT currency preferences"""
        self.log("=== TESTING UPDATE CURRENCY PREFERENCES ===")
        
        try:
            url = f"{self.base_url}/api/currency/preferences/"
            
            # Test data - update to South Sudanese Pound
            test_data = {
                'currency_code': 'SSP',
                'show_usd_on_invoices': True,
                'show_usd_on_quotes': True,
                'show_usd_on_reports': False
            }
            
            self.log(f"Making PUT request to: {url}")
            self.log(f"Data: {json.dumps(test_data, indent=2)}")
            
            response = self.session.put(url, json=test_data)
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.log("✅ PUT preferences success")
                    self.log(f"Response: {json.dumps(data, indent=2, default=str)}")
                    return data
                except Exception as e:
                    self.log(f"❌ JSON decode error: {str(e)}")
                    self.log(f"Raw response: {response.text[:1000]}")
                    return None
            else:
                self.log(f"❌ HTTP {response.status_code}")
                self.log(f"Response: {response.text[:1000]}")
                return None
                
        except Exception as e:
            self.log(f"❌ Request error: {str(e)}", "ERROR")
            return None
    
    def test_frontend_proxy(self):
        """Test frontend proxy endpoint"""
        self.log("=== TESTING FRONTEND PROXY ===")
        
        try:
            url = f"{self.frontend_url}/api/currency/preferences"
            self.log(f"Making GET request to frontend proxy: {url}")
            
            response = self.session.get(url)
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.log("✅ Frontend proxy success")
                    self.log(f"Response: {json.dumps(data, indent=2, default=str)}")
                    return data
                except Exception as e:
                    self.log(f"❌ JSON decode error: {str(e)}")
                    self.log(f"Raw response: {response.text[:1000]}")
                    return None
            else:
                self.log(f"❌ HTTP {response.status_code}")
                self.log(f"Response: {response.text[:1000]}")
                return None
                
        except Exception as e:
            self.log(f"❌ Request error: {str(e)}", "ERROR")
            return None
    
    def test_test_auth_endpoint(self):
        """Test the auth test endpoint"""
        self.log("=== TESTING AUTH TEST ENDPOINT ===")
        
        try:
            url = f"{self.base_url}/api/currency/test-auth"
            self.log(f"Making request to: {url}")
            
            response = self.session.get(url)
            self.log(f"Status: {response.status_code}")
            
            if response.status_code in [200, 401]:
                try:
                    data = response.json()
                    self.log(f"✅ Test auth endpoint response")
                    self.log(f"Response: {json.dumps(data, indent=2, default=str)}")
                    return data
                except Exception as e:
                    self.log(f"❌ JSON decode error: {str(e)}")
                    self.log(f"Raw response: {response.text[:1000]}")
                    return None
            else:
                self.log(f"❌ HTTP {response.status_code}")
                self.log(f"Response: {response.text[:1000]}")
                return None
                
        except Exception as e:
            self.log(f"❌ Request error: {str(e)}", "ERROR")
            return None
    
    def test_currencies_list(self):
        """Test currency list endpoint"""
        self.log("=== TESTING CURRENCY LIST ===")
        
        try:
            url = f"{self.base_url}/api/currency/list"
            self.log(f"Making request to: {url}")
            
            response = self.session.get(url)
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.log("✅ Currency list success")
                    self.log(f"Total currencies: {data.get('total', 'unknown')}")
                    if 'currencies' in data:
                        # Show first few currencies
                        currencies = data['currencies'][:5]
                        self.log(f"Sample currencies: {currencies}")
                    return data
                except Exception as e:
                    self.log(f"❌ JSON decode error: {str(e)}")
                    self.log(f"Raw response: {response.text[:1000]}")
                    return None
            else:
                self.log(f"❌ HTTP {response.status_code}")
                self.log(f"Response: {response.text[:1000]}")
                return None
                
        except Exception as e:
            self.log(f"❌ Request error: {str(e)}", "ERROR")
            return None
    
    def run_all_tests(self):
        """Run all API tests"""
        self.log("🔍 STARTING CURRENCY API TESTS")
        self.log("=" * 60)
        
        # Test 1: Test auth endpoint (should work without auth)
        self.test_test_auth_endpoint()
        print()
        
        # Test 2: Diagnostic endpoint
        self.test_diagnostic_endpoint()
        print()
        
        # Test 3: Currency list
        self.test_currencies_list()
        print()
        
        # Test 4: Frontend proxy
        self.test_frontend_proxy()
        print()
        
        # Test 5: Direct backend GET
        current_prefs = self.test_currency_preferences_get()
        print()
        
        # Test 6: Direct backend PUT (only if GET worked)
        if current_prefs:
            self.test_currency_preferences_update()
            print()
        
        self.log("=" * 60)
        self.log("🎯 API TESTS COMPLETE")

def main():
    """Main function"""
    tester = CurrencyAPITester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()
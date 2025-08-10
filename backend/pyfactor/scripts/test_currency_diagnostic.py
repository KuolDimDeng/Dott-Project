#!/usr/bin/env python3
"""
Currency Diagnostic Test Script
Tests the currency diagnostic endpoint and currency update flow
"""

import os
import sys
import django
import requests
import json
from datetime import datetime

# Add the project root to the Python path
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import User, Business, BusinessDetails
from custom_auth.models import User as AuthUser
from django.db import connection

class CurrencyDiagnosticTester:
    def __init__(self):
        self.base_url = "https://api.dottapps.com"
        self.test_email = "support@dottapps.com"
        self.session = requests.Session()
        
    def log(self, message, level="INFO"):
        """Log with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def test_database_connection(self):
        """Test database connection and table structure"""
        self.log("=== TESTING DATABASE CONNECTION ===")
        
        try:
            # Test connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT version()")
                version = cursor.fetchone()[0]
                self.log(f"✅ PostgreSQL connected: {version}")
                
                # Check if BusinessDetails table exists and has currency fields
                cursor.execute("""
                    SELECT column_name, data_type, is_nullable, column_default 
                    FROM information_schema.columns 
                    WHERE table_name = 'users_businessdetails' 
                    AND column_name LIKE '%currency%'
                    ORDER BY column_name
                """)
                
                currency_fields = cursor.fetchall()
                if currency_fields:
                    self.log("✅ Currency fields found in BusinessDetails:")
                    for field in currency_fields:
                        self.log(f"   - {field[0]}: {field[1]} (nullable: {field[2]}, default: {field[3]})")
                else:
                    self.log("❌ No currency fields found in BusinessDetails table")
                    return False
                    
                # Check if migration was applied
                cursor.execute("""
                    SELECT name FROM django_migrations 
                    WHERE app = 'users' AND name LIKE '%currency%'
                """)
                migrations = cursor.fetchall()
                if migrations:
                    self.log(f"✅ Currency migration applied: {[m[0] for m in migrations]}")
                else:
                    self.log("❌ Currency migration not found")
                    
                return True
                
        except Exception as e:
            self.log(f"❌ Database connection error: {str(e)}", "ERROR")
            return False
    
    def test_user_lookup(self):
        """Test user lookup and business relationship"""
        self.log("=== TESTING USER LOOKUP ===")
        
        try:
            # Try to find the user
            try:
                user = AuthUser.objects.get(email=self.test_email)
                self.log(f"✅ User found: {user.email} (ID: {user.id})")
                self.log(f"   - User type: {type(user).__name__}")
                self.log(f"   - User attributes: {[attr for attr in dir(user) if not attr.startswith('_') and not callable(getattr(user, attr))]}")
                
                # Check for business_id
                if hasattr(user, 'business_id'):
                    self.log(f"   - business_id: {user.business_id}")
                elif hasattr(user, 'tenant_id'):
                    self.log(f"   - tenant_id: {user.tenant_id}")
                else:
                    self.log("   - No business_id or tenant_id found")
                    
                # Check role
                if hasattr(user, 'role'):
                    self.log(f"   - role: {user.role}")
                else:
                    self.log("   - No role attribute found")
                    
                return user
                
            except AuthUser.DoesNotExist:
                self.log(f"❌ User {self.test_email} not found in custom_auth.User")
                return None
                
        except Exception as e:
            self.log(f"❌ User lookup error: {str(e)}", "ERROR")
            return None
    
    def test_business_lookup(self, user):
        """Test business lookup for user"""
        self.log("=== TESTING BUSINESS LOOKUP ===")
        
        try:
            business_id = None
            
            # Try different ways to get business_id
            if hasattr(user, 'business_id') and user.business_id:
                business_id = user.business_id
                self.log(f"✅ Found business_id on user: {business_id}")
            elif hasattr(user, 'tenant_id') and user.tenant_id:
                business_id = user.tenant_id
                self.log(f"✅ Using tenant_id as business_id: {business_id}")
            else:
                self.log("❌ No business_id found on user")
                return None, None
                
            # Get business
            try:
                business = Business.objects.get(id=business_id)
                self.log(f"✅ Business found: {business.name} (ID: {business.id})")
                
                # Get or create business details
                business_details, created = BusinessDetails.objects.get_or_create(
                    business=business,
                    defaults={
                        'preferred_currency_code': 'USD',
                        'preferred_currency_name': 'US Dollar',
                        'show_usd_on_invoices': True,
                        'show_usd_on_quotes': True,
                        'show_usd_on_reports': False,
                    }
                )
                
                if created:
                    self.log("✅ BusinessDetails created with defaults")
                else:
                    self.log("✅ BusinessDetails found")
                    
                self.log(f"   - preferred_currency_code: {business_details.preferred_currency_code}")
                self.log(f"   - preferred_currency_name: {business_details.preferred_currency_name}")
                self.log(f"   - show_usd_on_invoices: {business_details.show_usd_on_invoices}")
                self.log(f"   - show_usd_on_quotes: {business_details.show_usd_on_quotes}")
                self.log(f"   - show_usd_on_reports: {business_details.show_usd_on_reports}")
                
                return business, business_details
                
            except Business.DoesNotExist:
                self.log(f"❌ Business with ID {business_id} not found")
                return None, None
                
        except Exception as e:
            self.log(f"❌ Business lookup error: {str(e)}", "ERROR")
            return None, None
    
    def test_diagnostic_endpoint(self):
        """Test the diagnostic endpoint directly"""
        self.log("=== TESTING DIAGNOSTIC ENDPOINT ===")
        
        try:
            url = f"{self.base_url}/api/currency/diagnostic"
            self.log(f"Making request to: {url}")
            
            # Make request without authentication first
            response = self.session.get(url)
            self.log(f"Response status: {response.status_code}")
            self.log(f"Response headers: {dict(response.headers)}")
            
            if response.status_code == 401:
                self.log("❌ Authentication required - endpoint needs valid session")
                return False
            elif response.status_code == 200:
                try:
                    data = response.json()
                    self.log("✅ Diagnostic endpoint accessible")
                    self.log(f"Response data: {json.dumps(data, indent=2, default=str)}")
                    return True
                except Exception as json_error:
                    self.log(f"❌ JSON decode error: {str(json_error)}")
                    self.log(f"Raw response: {response.text[:500]}...")
                    return False
            else:
                self.log(f"❌ Unexpected status code: {response.status_code}")
                self.log(f"Response: {response.text[:500]}...")
                return False
                
        except Exception as e:
            self.log(f"❌ Diagnostic endpoint error: {str(e)}", "ERROR")
            return False
    
    def test_currency_update_direct(self, business_details):
        """Test currency update directly in database"""
        self.log("=== TESTING DIRECT CURRENCY UPDATE ===")
        
        try:
            # Save current values
            original_currency = business_details.preferred_currency_code
            original_name = business_details.preferred_currency_name
            
            self.log(f"Original currency: {original_currency} ({original_name})")
            
            # Try to update to SSP (South Sudanese Pound)
            test_currency = "SSP"
            test_name = "South Sudanese Pound"
            
            business_details.preferred_currency_code = test_currency
            business_details.preferred_currency_name = test_name
            business_details.save()
            
            # Refresh from database
            business_details.refresh_from_db()
            
            if business_details.preferred_currency_code == test_currency:
                self.log(f"✅ Currency update successful: {test_currency}")
                
                # Restore original values
                business_details.preferred_currency_code = original_currency
                business_details.preferred_currency_name = original_name
                business_details.save()
                self.log(f"✅ Currency restored to: {original_currency}")
                return True
            else:
                self.log(f"❌ Currency update failed - still {business_details.preferred_currency_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Direct currency update error: {str(e)}", "ERROR")
            return False
    
    def test_currency_data_service(self):
        """Test currency data service"""
        self.log("=== TESTING CURRENCY DATA SERVICE ===")
        
        try:
            from currency.currency_data import get_currency_list, get_currency_info
            
            # Test currency list
            currencies = get_currency_list()
            self.log(f"✅ Currency list loaded: {len(currencies)} currencies")
            
            # Test specific currencies
            test_codes = ['USD', 'EUR', 'SSP', 'KES']
            for code in test_codes:
                info = get_currency_info(code)
                if info:
                    self.log(f"✅ {code}: {info.get('name', 'Unknown')} ({info.get('symbol', '?')})")
                else:
                    self.log(f"❌ {code}: Not found")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Currency data service error: {str(e)}", "ERROR")
            return False
    
    def run_full_diagnostic(self):
        """Run complete diagnostic test"""
        self.log("🔍 STARTING CURRENCY DIAGNOSTIC TEST")
        self.log("=" * 50)
        
        # Test 1: Database connection
        if not self.test_database_connection():
            self.log("❌ Database tests failed - stopping", "ERROR")
            return
        
        # Test 2: User lookup
        user = self.test_user_lookup()
        if not user:
            self.log("❌ User lookup failed - stopping", "ERROR")
            return
        
        # Test 3: Business lookup
        business, business_details = self.test_business_lookup(user)
        if not business or not business_details:
            self.log("❌ Business lookup failed - stopping", "ERROR")
            return
        
        # Test 4: Currency data service
        self.test_currency_data_service()
        
        # Test 5: Direct currency update
        self.test_currency_update_direct(business_details)
        
        # Test 6: Diagnostic endpoint
        self.test_diagnostic_endpoint()
        
        self.log("=" * 50)
        self.log("🎯 DIAGNOSTIC COMPLETE")

def main():
    """Main function"""
    tester = CurrencyDiagnosticTester()
    tester.run_full_diagnostic()

if __name__ == "__main__":
    main()
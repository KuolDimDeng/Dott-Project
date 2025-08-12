#!/usr/bin/env python3
"""
Test script to verify currency flow through API serializers

This script tests the actual API flow to ensure new invoices use business currency.
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import Business, BusinessDetails
from sales.models import Invoice, Estimate
from sales.serializers import InvoiceSerializer, EstimateSerializer
from crm.models import Customer
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

def test_api_currency_flow():
    """Test the API serializer currency flow"""
    print("🧪 [CURRENCY-API-TEST] Starting API currency flow test...")
    
    try:
        # Step 1: Find a test business and user
        business = Business.objects.first()
        if not business:
            print("❌ [CURRENCY-API-TEST] No business found. Create a business first.")
            return False
        
        print(f"✅ [CURRENCY-API-TEST] Using business: {business.name}")
        
        # Get business details
        business_details = BusinessDetails.objects.filter(business=business).first()
        if not business_details:
            print("❌ [CURRENCY-API-TEST] No business details found.")
            return False
        
        # Step 2: Set test currency
        original_currency = business_details.preferred_currency_code
        test_currency = 'EUR' if original_currency != 'EUR' else 'GBP'
        
        print(f"🔄 [CURRENCY-API-TEST] Setting business currency to {test_currency}")
        business_details.preferred_currency_code = test_currency
        business_details.preferred_currency_name = f"{test_currency} Currency"
        business_details.currency_updated_at = timezone.now()
        business_details.save()
        
        # Step 3: Find a customer
        customer = Customer.objects.filter(tenant_id=business.id).first()
        if not customer:
            print("❌ [CURRENCY-API-TEST] No customer found. Create a customer first.")
            return False
            
        print(f"✅ [CURRENCY-API-TEST] Using customer: {customer.business_name}")
        
        # Step 4: Find a user for this business (for context)
        user = User.objects.filter(business_id=business.id).first()
        if not user:
            print("❌ [CURRENCY-API-TEST] No user found for this business.")
            return False
            
        print(f"✅ [CURRENCY-API-TEST] Using user: {user.email}")
        
        # Step 5: Test Invoice creation through serializer (API flow)
        invoice_data = {
            'customer': str(customer.id),  # Convert UUID to string
            'totalAmount': Decimal('100.00'),
            'date': timezone.now().date().isoformat(),  # Convert to string
            'status': 'draft',
            'items': []  # Add empty items array
        }
        
        # Create request-like context
        class MockRequest:
            def __init__(self, user):
                self.user = user
        
        mock_request = MockRequest(user)
        
        # Test with serializer (simulates API call)
        print("🔄 [CURRENCY-API-TEST] Creating invoice through serializer...")
        serializer = InvoiceSerializer(data=invoice_data, context={'request': mock_request})
        
        if serializer.is_valid():
            invoice = serializer.save()
            print(f"✅ [CURRENCY-API-TEST] Invoice created: {invoice.invoice_num}")
            print(f"✅ [CURRENCY-API-TEST] Invoice currency: {invoice.currency}")
            print(f"✅ [CURRENCY-API-TEST] Expected currency: {test_currency}")
            
            if invoice.currency == test_currency:
                print(f"✅ [CURRENCY-API-TEST] SUCCESS - Invoice uses business currency!")
            else:
                print(f"❌ [CURRENCY-API-TEST] FAILED - Currency mismatch")
                return False
                
            # Check exchange rate was set
            if invoice.exchange_rate:
                print(f"✅ [CURRENCY-API-TEST] Exchange rate captured: {invoice.exchange_rate}")
            else:
                print(f"⚠️ [CURRENCY-API-TEST] No exchange rate (might be expected for test)")
            
            # Cleanup
            invoice.delete()
            
        else:
            print(f"❌ [CURRENCY-API-TEST] Serializer validation failed: {serializer.errors}")
            return False
        
        # Step 6: Restore original currency
        business_details.preferred_currency_code = original_currency
        business_details.save()
        
        print(f"✅ [CURRENCY-API-TEST] Test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ [CURRENCY-API-TEST] Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_api_currency_flow()
    sys.exit(0 if success else 1)
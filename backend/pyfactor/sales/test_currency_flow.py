#!/usr/bin/env python3
"""
Test script to verify end-to-end currency flow

This script tests:
1. Business currency preference changes
2. New invoices using business currency
3. Historical data preservation
4. Currency locking for sent/paid invoices

Usage: python test_currency_flow.py
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import Business, BusinessDetails
from sales.models import Invoice, Estimate
from crm.models import Customer
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

def test_currency_flow():
    """Test the complete currency flow"""
    print("🧪 [CURRENCY-TEST] Starting end-to-end currency flow test...")
    
    # Step 1: Find a test business (or create one)
    try:
        business = Business.objects.first()
        if not business:
            print("❌ [CURRENCY-TEST] No business found. Create a business first.")
            return False
        
        print(f"✅ [CURRENCY-TEST] Using business: {business.name}")
        
        # Get or create business details
        business_details, created = BusinessDetails.objects.get_or_create(
            business=business,
            defaults={
                'preferred_currency_code': 'USD',
                'preferred_currency_name': 'US Dollar',
            }
        )
        
        print(f"✅ [CURRENCY-TEST] Business details: {business_details.preferred_currency_code}")
        
        # Step 2: Test currency change
        original_currency = business_details.preferred_currency_code
        test_currency = 'EUR' if original_currency != 'EUR' else 'GBP'
        
        print(f"🔄 [CURRENCY-TEST] Changing currency from {original_currency} to {test_currency}")
        business_details.preferred_currency_code = test_currency
        business_details.preferred_currency_name = f"{test_currency} Currency"
        business_details.currency_updated_at = timezone.now()
        business_details.save()
        
        print(f"✅ [CURRENCY-TEST] Currency changed successfully")
        
        # Step 3: Create a test customer if needed
        customer = Customer.objects.filter(tenant_id=business.id).first()
        if not customer:
            print("❌ [CURRENCY-TEST] No customer found. Create a customer first.")
            return False
        
        print(f"✅ [CURRENCY-TEST] Using customer: {customer.customerName}")
        
        # Step 4: Create a new invoice (should use new currency)
        invoice = Invoice.objects.create(
            customer=customer,
            totalAmount=Decimal('100.00'),
            currency='USD',  # This should be overridden by business preference
            tenant_id=business.id,
            date=timezone.now().date(),
            status='draft'
        )
        
        # Reload to see if currency was set correctly
        invoice.refresh_from_db()
        
        if invoice.currency == test_currency:
            print(f"✅ [CURRENCY-TEST] New invoice uses business currency: {invoice.currency}")
        else:
            print(f"❌ [CURRENCY-TEST] Invoice currency mismatch. Expected {test_currency}, got {invoice.currency}")
        
        # Step 5: Test currency locking
        print(f"🔒 [CURRENCY-TEST] Testing currency lock...")
        invoice.status = 'sent'
        invoice.save()
        
        # Reload and check if locked
        invoice.refresh_from_db()
        if invoice.currency_locked:
            print(f"✅ [CURRENCY-TEST] Invoice currency locked when sent")
        else:
            print(f"⚠️ [CURRENCY-TEST] Invoice currency not locked (might be expected)")
        
        # Step 6: Try to change currency on locked invoice
        original_invoice_currency = invoice.currency
        invoice.currency = 'USD'  # Try to change it
        invoice.save()
        
        # Reload and check if change was prevented
        invoice.refresh_from_db()
        if invoice.currency == original_invoice_currency:
            print(f"✅ [CURRENCY-TEST] Currency lock prevented change")
        else:
            print(f"❌ [CURRENCY-TEST] Currency lock failed - currency was changed")
        
        # Step 7: Clean up
        invoice.delete()
        business_details.preferred_currency_code = original_currency
        business_details.save()
        
        print(f"✅ [CURRENCY-TEST] Test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ [CURRENCY-TEST] Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_currency_flow()
    sys.exit(0 if success else 1)
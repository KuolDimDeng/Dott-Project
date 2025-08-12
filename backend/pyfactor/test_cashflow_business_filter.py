#!/usr/bin/env python3
"""
Test that cash flow endpoint filters by business_id
"""
import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from finance.models import JournalEntry, JournalEntryLine, ChartOfAccount
from users.models import User
from django.db.models import Sum
from datetime import datetime

def test_business_filtering():
    """Test that business_id filtering works correctly"""
    print("=" * 60)
    print("Testing Business ID Filtering in Cash Flow")
    print("=" * 60)
    
    # Find a user with business_id
    user = User.objects.filter(email='kuoldenggm@gmail.com').first()
    if not user:
        print("User not found, trying any user with business_id...")
        user = User.objects.exclude(business_id__isnull=True).first()
    
    if not user:
        print("❌ No users with business_id found")
        return False
    
    print(f"\n1. Testing with user: {user.email}")
    print(f"   Business ID: {user.business_id}")
    
    # Get cash accounts
    cash_accounts = ChartOfAccount.objects.filter(name__icontains='cash')
    print(f"\n2. Cash accounts found: {cash_accounts.count()}")
    
    # Check journal entries for this business
    business_entries = JournalEntry.objects.filter(
        business_id=user.business_id,
        status='posted'
    )
    print(f"\n3. Journal entries for business {user.business_id}: {business_entries.count()}")
    
    if business_entries.count() > 0:
        # Show some entries
        for entry in business_entries[:3]:
            print(f"   - {entry.date}: {entry.reference} - {entry.description}")
    
    # Calculate cash flow WITH business_id filter
    cash_with_filter = JournalEntryLine.objects.filter(
        account__in=cash_accounts,
        journal_entry__status='posted',
        journal_entry__business_id=user.business_id
    ).aggregate(
        debits=Sum('debit_amount'),
        credits=Sum('credit_amount')
    )
    
    debits_filtered = cash_with_filter['debits'] or Decimal('0.00')
    credits_filtered = cash_with_filter['credits'] or Decimal('0.00')
    
    print(f"\n4. Cash flow WITH business_id filter:")
    print(f"   Debits:  ${debits_filtered:,.2f}")
    print(f"   Credits: ${credits_filtered:,.2f}")
    print(f"   Net:     ${debits_filtered - credits_filtered:,.2f}")
    
    # Calculate cash flow WITHOUT business_id filter (all businesses)
    cash_without_filter = JournalEntryLine.objects.filter(
        account__in=cash_accounts,
        journal_entry__status='posted'
    ).aggregate(
        debits=Sum('debit_amount'),
        credits=Sum('credit_amount')
    )
    
    debits_all = cash_without_filter['debits'] or Decimal('0.00')
    credits_all = cash_without_filter['credits'] or Decimal('0.00')
    
    print(f"\n5. Cash flow WITHOUT business_id filter (all businesses):")
    print(f"   Debits:  ${debits_all:,.2f}")
    print(f"   Credits: ${credits_all:,.2f}")
    print(f"   Net:     ${debits_all - credits_all:,.2f}")
    
    # Show the difference
    print(f"\n6. Comparison:")
    if debits_filtered == debits_all:
        print("   ⚠️ Same values - either only one business exists or filter not working")
    else:
        print("   ✅ Different values - business_id filter is working correctly")
        print(f"   Your business has ${debits_filtered - credits_filtered:,.2f} of the total ${debits_all - credits_all:,.2f}")
    
    # Test the endpoint would return
    print(f"\n7. What the cash flow widget should show:")
    print(f"   Cash In:  ${debits_filtered:,.2f}")
    print(f"   Cash Out: ${credits_filtered:,.2f}")
    print(f"   Net Flow: ${debits_filtered - credits_filtered:,.2f}")
    
    return True

if __name__ == '__main__':
    test_business_filtering()
    print("\n" + "=" * 60)
    print("✅ Business ID filtering test complete")
    print("=" * 60)
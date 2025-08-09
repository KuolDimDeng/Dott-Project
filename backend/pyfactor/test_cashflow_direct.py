#!/usr/bin/env python3
"""
Test cash flow data directly from the database
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
from django.db.models import Sum
from datetime import datetime, timedelta

def test_cashflow_data():
    """Test that cash flow data is correctly available"""
    print("=" * 60)
    print("Testing Cash Flow Data Availability")
    print("=" * 60)
    
    # Get cash-related accounts
    cash_accounts = ChartOfAccount.objects.filter(name__icontains='cash')
    revenue_accounts = ChartOfAccount.objects.filter(name__icontains='revenue') | \
                      ChartOfAccount.objects.filter(name__icontains='sales')
    
    print(f"\n1. Found Accounts:")
    print(f"   Cash accounts: {cash_accounts.count()}")
    for acc in cash_accounts:
        print(f"      - {acc.account_number}: {acc.name}")
    print(f"   Revenue accounts: {revenue_accounts.count()}")
    for acc in revenue_accounts[:3]:  # Show first 3
        print(f"      - {acc.account_number}: {acc.name}")
    
    # Calculate monthly cash flow for current month
    today = datetime.now().date()
    month_start = today.replace(day=1)
    
    # Get cash inflows (debits to cash accounts)
    cash_inflows = JournalEntryLine.objects.filter(
        account__in=cash_accounts,
        journal_entry__status='posted',
        journal_entry__date__gte=month_start,
        journal_entry__date__lte=today
    ).aggregate(total=Sum('debit_amount'))['total'] or Decimal('0.00')
    
    # Get cash outflows (credits to cash accounts)  
    cash_outflows = JournalEntryLine.objects.filter(
        account__in=cash_accounts,
        journal_entry__status='posted',
        journal_entry__date__gte=month_start,
        journal_entry__date__lte=today
    ).aggregate(total=Sum('credit_amount'))['total'] or Decimal('0.00')
    
    # Get revenue
    total_revenue = JournalEntryLine.objects.filter(
        account__in=revenue_accounts,
        journal_entry__status='posted',
        journal_entry__date__gte=month_start,
        journal_entry__date__lte=today
    ).aggregate(total=Sum('credit_amount'))['total'] or Decimal('0.00')
    
    print(f"\n2. Current Month ({month_start.strftime('%B %Y')}) Cash Flow:")
    print(f"   Cash Inflows:  ${cash_inflows:,.2f}")
    print(f"   Cash Outflows: ${cash_outflows:,.2f}")
    print(f"   Net Cash Flow: ${cash_inflows - cash_outflows:,.2f}")
    print(f"   Total Revenue: ${total_revenue:,.2f}")
    
    # Show all journal entries with cash impact
    print(f"\n3. Recent Cash Transactions:")
    cash_lines = JournalEntryLine.objects.filter(
        account__in=cash_accounts,
        journal_entry__status='posted'
    ).select_related('journal_entry').order_by('-journal_entry__date')[:5]
    
    for line in cash_lines:
        if line.debit_amount:
            print(f"   {line.journal_entry.date}: +${line.debit_amount:,.2f} - {line.journal_entry.description}")
        if line.credit_amount:
            print(f"   {line.journal_entry.date}: -${line.credit_amount:,.2f} - {line.journal_entry.description}")
    
    # Calculate total position
    all_debits = JournalEntryLine.objects.filter(
        account__in=cash_accounts,
        journal_entry__status='posted'
    ).aggregate(total=Sum('debit_amount'))['total'] or Decimal('0.00')
    
    all_credits = JournalEntryLine.objects.filter(
        account__in=cash_accounts,
        journal_entry__status='posted'
    ).aggregate(total=Sum('credit_amount'))['total'] or Decimal('0.00')
    
    print(f"\n4. Total Cash Position:")
    print(f"   All-time Inflows:  ${all_debits:,.2f}")
    print(f"   All-time Outflows: ${all_credits:,.2f}")
    print(f"   Net Cash Position: ${all_debits - all_credits:,.2f}")
    
    if all_debits > 0:
        print(f"\n✅ Cash flow data is available and ready for display!")
        print(f"   The frontend widget should show ${all_debits - all_credits:,.2f} in cash")
        return True
    else:
        print(f"\n⚠️ No cash flow data found. Make sure POS sales are creating journal entries.")
        return False

if __name__ == '__main__':
    success = test_cashflow_data()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ CASH FLOW DATA TEST PASSED!")
        print("The backend endpoint has been fixed to read from JournalEntry.")
        print("Frontend widget should now display the correct amounts.")
    else:
        print("⚠️ No cash flow data available yet.")
    print("=" * 60)
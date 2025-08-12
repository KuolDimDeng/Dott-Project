#!/usr/bin/env python3
"""
Script to verify cash flow is working on production
Run this in the Render shell to check
"""

print("Checking Cash Flow on Production")
print("=" * 60)

from finance.models import JournalEntry, JournalEntryLine, ChartOfAccount
from django.db.models import Sum
from decimal import Decimal
from datetime import datetime

# Check for journal entries
entries = JournalEntry.objects.filter(status='posted').count()
print(f"\n1. Total Posted Journal Entries: {entries}")

# Get cash accounts
cash_accounts = ChartOfAccount.objects.filter(name__icontains='cash')
print(f"\n2. Cash Accounts Found: {cash_accounts.count()}")
for acc in cash_accounts:
    print(f"   - {acc.account_number}: {acc.name}")

# Calculate total cash position
if cash_accounts:
    total_debits = JournalEntryLine.objects.filter(
        account__in=cash_accounts,
        journal_entry__status='posted'
    ).aggregate(total=Sum('debit_amount'))['total'] or Decimal('0.00')
    
    total_credits = JournalEntryLine.objects.filter(
        account__in=cash_accounts,
        journal_entry__status='posted'
    ).aggregate(total=Sum('credit_amount'))['total'] or Decimal('0.00')
    
    print(f"\n3. Cash Flow Summary:")
    print(f"   Total Cash Inflows:  ${total_debits:,.2f}")
    print(f"   Total Cash Outflows: ${total_credits:,.2f}")
    print(f"   Net Cash Position:   ${total_debits - total_credits:,.2f}")
    
    # Show recent POS transactions
    recent_cash = JournalEntryLine.objects.filter(
        account__in=cash_accounts,
        journal_entry__status='posted',
        journal_entry__description__icontains='POS'
    ).select_related('journal_entry').order_by('-journal_entry__date')[:5]
    
    if recent_cash:
        print(f"\n4. Recent POS Sales (Cash Impact):")
        for line in recent_cash:
            if line.debit_amount:
                print(f"   {line.journal_entry.date}: +${line.debit_amount:,.2f} - {line.journal_entry.description}")
    else:
        print(f"\n4. No POS sales found in journal entries")
        
    # Check current month
    today = datetime.now().date()
    month_start = today.replace(day=1)
    
    month_cash = JournalEntryLine.objects.filter(
        account__in=cash_accounts,
        journal_entry__status='posted',
        journal_entry__date__gte=month_start
    ).aggregate(
        debits=Sum('debit_amount'),
        credits=Sum('credit_amount')
    )
    
    month_debits = month_cash['debits'] or Decimal('0.00')
    month_credits = month_cash['credits'] or Decimal('0.00')
    
    print(f"\n5. Current Month ({today.strftime('%B %Y')}):")
    print(f"   Cash Inflows:  ${month_debits:,.2f}")
    print(f"   Cash Outflows: ${month_credits:,.2f}")
    print(f"   Net Cash Flow: ${month_debits - month_credits:,.2f}")

print("\n" + "=" * 60)
if entries > 0 and total_debits > 0:
    print("✅ Cash flow data is available!")
    print(f"   The widget should show ${total_debits - total_credits:,.2f}")
else:
    print("⚠️ No cash flow data yet. Make a POS sale to test!")
print("=" * 60)
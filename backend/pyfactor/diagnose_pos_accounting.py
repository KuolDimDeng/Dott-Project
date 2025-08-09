#!/usr/bin/env python3
"""
Script to diagnose why POS sales aren't updating cash flow
Run this in the Render shell after making a POS sale
"""

print("Diagnosing POS to Accounting Integration")
print("=" * 60)

from sales.models import POSTransaction
from finance.models import JournalEntry, JournalEntryLine, ChartOfAccount
from django.db.models import Sum
from datetime import datetime, timedelta

# 1. Check recent POS transactions
print("\n1. Recent POS Transactions:")
recent_pos = POSTransaction.objects.filter(status='completed').order_by('-created_at')[:5]
if recent_pos:
    for pos in recent_pos:
        print(f"   {pos.created_at.date()}: {pos.transaction_number} - ${pos.total_amount} ({pos.payment_method})")
        # Check if this POS has a journal entry
        if hasattr(pos, 'journal_entry') and pos.journal_entry:
            print(f"      ✅ Has journal entry: {pos.journal_entry.reference}")
        else:
            print(f"      ❌ NO JOURNAL ENTRY LINKED")
else:
    print("   No POS transactions found")

# 2. Check if accounts exist
print("\n2. Critical Accounts Check:")
critical_accounts = {
    'Cash': ChartOfAccount.objects.filter(name__icontains='cash').first(),
    'Sales Revenue': ChartOfAccount.objects.filter(name__icontains='sales revenue').first(),
    'COGS': ChartOfAccount.objects.filter(name__icontains='cost of goods sold').first(),
    'Inventory': ChartOfAccount.objects.filter(name__icontains='inventory').first(),
    'Sales Tax': ChartOfAccount.objects.filter(name__icontains='sales tax').first()
}

for name, account in critical_accounts.items():
    if account:
        print(f"   ✅ {name}: {account.account_number} - {account.name}")
    else:
        print(f"   ❌ {name}: NOT FOUND")

# 3. Check journal entries
print("\n3. Recent Journal Entries:")
recent_journals = JournalEntry.objects.order_by('-created_at')[:5]
if recent_journals:
    for entry in recent_journals:
        print(f"   {entry.date}: {entry.reference} - {entry.description} (Status: {entry.status})")
        # Check if this is from a POS sale
        if 'POS' in entry.description:
            print(f"      ✅ This is a POS journal entry")
            # Show the lines
            lines = entry.lines.all()
            for line in lines:
                if line.debit_amount:
                    print(f"         Dr: {line.account.name} ${line.debit_amount}")
                if line.credit_amount:
                    print(f"         Cr: {line.account.name} ${line.credit_amount}")
else:
    print("   No journal entries found")

# 4. Check cash position
print("\n4. Cash Position:")
cash_account = ChartOfAccount.objects.filter(name__icontains='cash').first()
if cash_account:
    total_debits = JournalEntryLine.objects.filter(
        account=cash_account,
        journal_entry__status='posted'
    ).aggregate(Sum('debit_amount'))['debit_amount__sum'] or 0
    
    total_credits = JournalEntryLine.objects.filter(
        account=cash_account,
        journal_entry__status='posted'
    ).aggregate(Sum('credit_amount'))['credit_amount__sum'] or 0
    
    print(f"   Cash Debits:  ${total_debits:,.2f}")
    print(f"   Cash Credits: ${total_credits:,.2f}")
    print(f"   Net Cash:     ${total_debits - total_credits:,.2f}")
else:
    print("   ❌ No cash account found")

# 5. Check for orphaned journal entries
print("\n5. Checking for POS Journal Entry Creation Issues:")
# Look for POS transactions without journal entries
pos_without_journal = POSTransaction.objects.filter(
    status='completed',
    journal_entry__isnull=True
).count()
print(f"   Completed POS transactions without journal entries: {pos_without_journal}")

if pos_without_journal > 0:
    print("\n   ⚠️ PROBLEM FOUND: POS sales are not creating journal entries!")
    print("   Possible causes:")
    print("   - AccountingService.create_sale_journal_entry not being called")
    print("   - Error in journal entry creation (check logs)")
    print("   - Missing business_id on journal entry")

print("\n" + "=" * 60)
if pos_without_journal == 0 and total_debits > 0:
    print("✅ System is working correctly")
else:
    print("❌ Issue detected - POS sales not creating accounting entries")
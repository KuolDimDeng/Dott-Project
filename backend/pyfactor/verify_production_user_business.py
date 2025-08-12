#!/usr/bin/env python3
"""
Script to verify which user and business has the journal entries on production
Run this in the Render shell
"""

print("Checking User and Business Association")
print("=" * 60)

from users.models import User
from finance.models import JournalEntry, JournalEntryLine, ChartOfAccount
from django.db.models import Sum
from decimal import Decimal

# Find user by email - try different variations
emails_to_check = ['kuoldenggm@gmail.com', 'kuoldeng@gmail.com', 'kuol@gmail.com']
user = None

for email in emails_to_check:
    user = User.objects.filter(email=email).first()
    if user:
        print(f"\n1. Found user: {email}")
        print(f"   Business ID: {user.business_id}")
        print(f"   Is Onboarded: {user.is_onboarded}")
        break

if not user:
    print("\n1. Your user account not found. Checking all users...")
    all_users = User.objects.all()
    for u in all_users:
        print(f"   - {u.email}: business_id={u.business_id}")

# Check journal entries
print("\n2. Journal Entries by Business:")
from collections import Counter
entries = JournalEntry.objects.filter(status='posted')
business_counts = Counter([str(e.business_id) if e.business_id else 'NULL' for e in entries])

for bid, count in business_counts.items():
    print(f"   Business {bid}: {count} entries")
    # Show which user owns this business
    owner = User.objects.filter(business_id=bid).first()
    if owner:
        print(f"      Owner: {owner.email}")

# Check cash position for each business
print("\n3. Cash Position by Business:")
cash_accounts = ChartOfAccount.objects.filter(name__icontains='cash')

for bid, count in business_counts.items():
    if bid != 'NULL':
        cash_lines = JournalEntryLine.objects.filter(
            account__in=cash_accounts,
            journal_entry__status='posted',
            journal_entry__business_id=bid
        ).aggregate(
            debits=Sum('debit_amount'),
            credits=Sum('credit_amount')
        )
        
        debits = cash_lines['debits'] or Decimal('0.00')
        credits = cash_lines['credits'] or Decimal('0.00')
        net = debits - credits
        
        print(f"   Business {bid}:")
        print(f"      Cash position: ${net:,.2f}")
        owner = User.objects.filter(business_id=bid).first()
        if owner:
            print(f"      Owner: {owner.email}")

print("\n" + "=" * 60)
print("Summary:")
if user and user.business_id:
    user_entries = JournalEntry.objects.filter(business_id=user.business_id, status='posted').count()
    if user_entries > 0:
        print(f"✅ Your account ({user.email}) has {user_entries} journal entries")
    else:
        print(f"⚠️ Your account ({user.email}) has NO journal entries")
        print("   You need to make POS sales from YOUR account to see cash flow")
else:
    print("⚠️ Could not find your user account or it has no business_id")
print("=" * 60)
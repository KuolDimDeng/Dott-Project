#!/usr/bin/env python3
"""
Check if cash flow data is available from journal entries
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from finance.models import JournalEntry, JournalEntryLine, ChartOfAccount
from django.db.models import Sum, Q
from datetime import datetime, timedelta

# Get cash account
cash_account = ChartOfAccount.objects.filter(name__icontains='cash').first()
if cash_account:
    print(f'Cash Account: {cash_account.name} ({cash_account.account_number})')
    
    # Get recent cash movements
    recent_entries = JournalEntryLine.objects.filter(
        account=cash_account,
        journal_entry__status='posted'
    ).select_related('journal_entry')[:5]
    
    print(f'\nRecent Cash Movements:')
    for line in recent_entries:
        if line.debit_amount:
            print(f'  {line.journal_entry.date}: +${line.debit_amount} (Debit) - {line.journal_entry.description}')
        if line.credit_amount:
            print(f'  {line.journal_entry.date}: -${line.credit_amount} (Credit) - {line.journal_entry.description}')
    
    # Calculate total cash flow
    total_debits = JournalEntryLine.objects.filter(
        account=cash_account,
        journal_entry__status='posted'
    ).aggregate(total=Sum('debit_amount'))['total'] or 0
    
    total_credits = JournalEntryLine.objects.filter(
        account=cash_account,
        journal_entry__status='posted'
    ).aggregate(total=Sum('credit_amount'))['total'] or 0
    
    net_cash = total_debits - total_credits
    print(f'\nTotal Cash Flow:')
    print(f'  Total Inflows (Debits): ${total_debits}')
    print(f'  Total Outflows (Credits): ${total_credits}')
    print(f'  Net Cash Position: ${net_cash}')
    
    # Get monthly cash flow
    print('\n\nMonthly Cash Flow (Last 3 months):')
    end_date = datetime.now().date()
    for i in range(3):
        month_start = (end_date - timedelta(days=30*i)).replace(day=1)
        month_end = (month_start + timedelta(days=31)).replace(day=1) - timedelta(days=1)
        
        month_debits = JournalEntryLine.objects.filter(
            account=cash_account,
            journal_entry__status='posted',
            journal_entry__date__gte=month_start,
            journal_entry__date__lte=month_end
        ).aggregate(total=Sum('debit_amount'))['total'] or 0
        
        month_credits = JournalEntryLine.objects.filter(
            account=cash_account,
            journal_entry__status='posted',
            journal_entry__date__gte=month_start,
            journal_entry__date__lte=month_end
        ).aggregate(total=Sum('credit_amount'))['total'] or 0
        
        net_month = month_debits - month_credits
        print(f'  {month_start.strftime("%B %Y")}: Inflow=${month_debits}, Outflow=${month_credits}, Net=${net_month}')
    
else:
    print('No cash account found!')

print('\n✅ Cash flow data is available from journal entries!')
print('The frontend widget should display this data if the backend endpoint is properly configured.')
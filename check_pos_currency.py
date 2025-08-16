#!/usr/bin/env python3
"""
Check POS transactions in the database to see what currency is stored
"""
import os
import sys
import django

# Add the backend path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings'

django.setup()

from sales.models import POSTransaction
from django.db import connection

# Check the database schema
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'sales_postransaction' 
        AND column_name IN ('currency_code', 'currency_symbol')
    """)
    columns = cursor.fetchall()
    print("Database columns for POSTransaction:")
    for col in columns:
        print(f"  - {col[0]}: {col[1]}")

# Get recent transactions
print("\nRecent POS Transactions:")
transactions = POSTransaction.objects.all().order_by('-created_at')[:5]
for txn in transactions:
    print(f"\nTransaction: {txn.transaction_number}")
    print(f"  Created: {txn.created_at}")
    print(f"  Total: {txn.total_amount}")
    print(f"  Currency Code: {txn.currency_code}")
    print(f"  Currency Symbol: {txn.currency_symbol}")
    print(f"  Customer: {txn.customer.business_name if txn.customer else 'Walk-in'}")

# Check if there's a specific transaction
test_txn_number = "TXN-c8da1395-e411-4fbb-908c-778ed9cd4398"
try:
    test_txn = POSTransaction.objects.get(transaction_number=test_txn_number)
    print(f"\n\nSpecific Transaction {test_txn_number}:")
    print(f"  Currency Code: {test_txn.currency_code}")
    print(f"  Currency Symbol: {test_txn.currency_symbol}")
    print(f"  Total: {test_txn.total_amount}")
except POSTransaction.DoesNotExist:
    print(f"\nTransaction {test_txn_number} not found")
#!/usr/bin/env python
"""
Check if POS transactions have currency data in database
"""
import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from sales.models import POSTransaction
from sales.serializers import POSTransactionListSerializer

def check_currency_data():
    """Check currency data in transactions"""
    print("=== Checking Currency Data in POS Transactions ===\n")
    
    # Get all transactions
    transactions = POSTransaction.objects.all()[:5]  # Get first 5
    
    print("Raw Database Values:")
    print("-" * 50)
    for trans in transactions:
        print(f"Transaction: {trans.transaction_number}")
        print(f"  - currency_code: {trans.currency_code}")
        print(f"  - currency_symbol: {trans.currency_symbol}")
        print(f"  - total_amount: {trans.total_amount}")
        print()
    
    print("\nSerialized Values (what API returns):")
    print("-" * 50)
    for trans in transactions:
        serializer = POSTransactionListSerializer(trans)
        data = serializer.data
        print(f"Transaction: {data.get('transaction_number')}")
        print(f"  - Full data keys: {list(data.keys())}")
        print(f"  - currency_code: {data.get('currency_code')}")
        print(f"  - currency_symbol: {data.get('currency_symbol')}")
        print(f"  - total_amount: {data.get('total_amount')}")
        print()

if __name__ == "__main__":
    check_currency_data()
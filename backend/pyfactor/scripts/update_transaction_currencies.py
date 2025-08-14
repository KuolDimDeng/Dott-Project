#!/usr/bin/env python
"""
Update existing POS transactions with correct currency based on user preferences
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
from users.models import UserProfile
from django.db import transaction


def update_transaction_currencies():
    """Update transactions that have NULL or default USD currency"""
    print("=== Updating POS Transaction Currencies ===")
    
    # Get all transactions
    transactions = POSTransaction.objects.all()
    updated_count = 0
    
    for trans in transactions:
        try:
            # Skip if already has proper currency (not USD unless user prefers USD)
            if trans.currency_code and trans.currency_code != 'USD':
                continue
            
            # Get the user who created this transaction
            user = trans.created_by
            if not user:
                continue
                
            # Get user's profile
            profile = UserProfile.objects.filter(user=user).first()
            if not profile:
                continue
            
            # Get user's preferred currency
            preferred_currency = profile.preferred_currency_code or 'USD'
            preferred_symbol = profile.preferred_currency_symbol or '$'
            
            # For South Sudan users, use SSP
            if profile.country == 'SS':
                preferred_currency = 'SSP'
                preferred_symbol = 'SSP'
            
            # Update transaction if needed
            if trans.currency_code != preferred_currency:
                trans.currency_code = preferred_currency
                trans.currency_symbol = preferred_symbol
                trans.save()
                updated_count += 1
                print(f"Updated transaction {trans.transaction_number} to {preferred_currency}")
        
        except Exception as e:
            print(f"Error updating transaction {trans.id}: {e}")
    
    print(f"\n✅ Updated {updated_count} transactions")
    return updated_count


if __name__ == "__main__":
    with transaction.atomic():
        update_transaction_currencies()
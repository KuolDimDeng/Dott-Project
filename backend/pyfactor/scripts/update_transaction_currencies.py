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
from users.models import UserProfile, BusinessSettings
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
                
            # Get business settings for the tenant
            business_settings = BusinessSettings.objects.filter(
                tenant_id=trans.tenant_id
            ).first()
            
            if business_settings:
                # Use business currency settings
                preferred_currency = business_settings.preferred_currency_code or 'USD'
                preferred_symbol = business_settings.preferred_currency_symbol or '$'
            else:
                # Fallback to user profile
                profile = UserProfile.objects.filter(user=user).first()
                if not profile:
                    continue
                
                # For South Sudan users, use SSP
                if profile.country == 'SS':
                    preferred_currency = 'SSP'
                    preferred_symbol = 'SSP'
                else:
                    preferred_currency = 'USD'
                    preferred_symbol = '$'
            
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
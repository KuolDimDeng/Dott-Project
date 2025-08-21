#!/usr/bin/env python
"""
Script to update Smart Insights credits for a specific user
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from django.contrib.auth import get_user_model
from smart_insights.models import UserCredit
from datetime import datetime

User = get_user_model()

def update_user_credits(email, credits_amount):
    """Update Smart Insights credits for a specific user"""
    
    try:
        with transaction.atomic():
            # Find the user
            user = User.objects.filter(email=email).first()
            
            if not user:
                print(f"❌ User with email '{email}' not found")
                return False
            
            print(f"✅ Found user: {user.email} (ID: {user.id})")
            print(f"   Business: {user.business_name or 'N/A'}")
            print(f"   Tenant ID: {user.business_id or user.tenant_id or 'N/A'}")
            
            # Get or create UserCredit for the user
            credit, created = UserCredit.objects.get_or_create(
                user=user,
                defaults={
                    'balance': credits_amount,
                    'total_purchased': 0,
                    'total_used': 0
                }
            )
            
            if created:
                print(f"✅ Created new credit record with {credits_amount} credits")
            else:
                old_balance = credit.balance
                credit.balance = credits_amount
                credit.save()
                print(f"✅ Updated balance from {old_balance} to {credits_amount}")
            
            # Display current status
            print(f"\n📊 Current Status:")
            print(f"   Balance: {credit.balance}")
            print(f"   Total Purchased: {credit.total_purchased}")
            print(f"   Total Used: {credit.total_used}")
            print(f"   Monthly Spend Limit: ${credit.monthly_spend_limit}")
            print(f"   Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error updating credits: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("=" * 60)
    print("Smart Insights Credit Update Tool")
    print("=" * 60)
    
    # Update credits for support@dottapps.com
    email = "support@dottapps.com"
    credits = 100
    
    print(f"\n🎯 Updating credits for: {email}")
    print(f"   New credit amount: {credits}")
    print("-" * 60)
    
    success = update_user_credits(email, credits)
    
    if success:
        print("\n✅ Successfully updated Smart Insights credits!")
    else:
        print("\n❌ Failed to update credits")
        sys.exit(1)

if __name__ == "__main__":
    main()
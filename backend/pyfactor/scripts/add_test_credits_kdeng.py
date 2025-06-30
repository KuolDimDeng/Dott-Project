#!/usr/bin/env python
"""
Quick script to add 200 test credits to kdeng@dottapps.com
Run this from Django shell: python manage.py shell < scripts/add_test_credits_kdeng.py
"""

from django.contrib.auth import get_user_model
from smart_insights.models import UserCredit, CreditTransaction
from decimal import Decimal
from django.utils import timezone

User = get_user_model()

email = 'kdeng@dottapps.com'
credits_to_add = 200

try:
    # Find the user
    user = User.objects.get(email=email)
    print(f"Found user: {user.email}")
    
    # Get or create user credit record
    user_credit, created = UserCredit.objects.get_or_create(
        user=user,
        defaults={'balance': 0}
    )
    
    # Store current balance
    old_balance = user_credit.balance
    
    # Add credits
    user_credit.balance += credits_to_add
    user_credit.total_purchased += credits_to_add  # Track as if purchased
    user_credit.save()
    
    # Create transaction record
    CreditTransaction.objects.create(
        user=user,
        transaction_type='grant',
        amount=credits_to_add,
        balance_before=old_balance,
        balance_after=user_credit.balance,
        description=f"Test credits: Added {credits_to_add} credits for testing Smart Insights",
        created_at=timezone.now()
    )
    
    print(f"\n✅ Successfully added {credits_to_add} credits to {email}")
    print(f"   Previous balance: {old_balance}")
    print(f"   New balance: {user_credit.balance}")
    print(f"   Total purchased: {user_credit.total_purchased}")
    
except User.DoesNotExist:
    print(f"❌ User with email '{email}' not found")
except Exception as e:
    print(f"❌ Error adding credits: {str(e)}")
    import traceback
    traceback.print_exc()
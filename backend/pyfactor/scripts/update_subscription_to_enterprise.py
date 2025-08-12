#!/usr/bin/env python3
"""
Script to update subscription to enterprise for jubacargovillage@outlook.com
Run this on the production server.
"""

import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, '/app/backend/pyfactor')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import User, UserProfile, Business, Subscription
from users.subscription_service import SubscriptionService
from django.utils import timezone

def update_subscription():
    """Update subscription to enterprise for specified user"""
    
    email = 'jubacargovillage@outlook.com'
    
    try:
        # Find the user
        user = User.objects.filter(email=email).first()
        if not user:
            print(f'❌ User {email} not found')
            return False
        
        print(f'✅ Found user: {user.email} (ID: {user.id})')
        
        # Get user profile
        profile = UserProfile.objects.filter(user=user).first()
        if not profile:
            print('❌ User profile not found')
            return False
        
        print(f'✅ Found profile with business_id: {profile.business_id}')
        
        # Get the business
        business = Business.objects.filter(id=profile.business_id).first()
        if not business:
            print('❌ Business not found')
            return False
        
        print(f'✅ Found business: {business.name} (ID: {business.id})')
        
        # Check current subscription
        current_sub = Subscription.objects.filter(business=business).first()
        if current_sub:
            print(f'📊 Current subscription: {current_sub.selected_plan} (Active: {current_sub.is_active})')
        else:
            print('📊 No current subscription found, creating new one')
        
        # Update or create subscription using the centralized service
        print('\n🔄 Updating subscription to enterprise...')
        subscription = SubscriptionService.create_or_update_subscription(
            tenant_id=str(business.id),
            plan='enterprise',
            status='active',
            billing_cycle='monthly'
        )
        
        print(f'✅ Subscription updated successfully!')
        print(f'   Plan: {subscription.selected_plan}')
        print(f'   Status: active')
        print(f'   Active: {subscription.is_active}')
        
        # Verify using the service
        plan = SubscriptionService.get_subscription_plan(str(business.id))
        print(f'\n✅ Verification: SubscriptionService.get_subscription_plan returns: {plan}')
        
        # Clear cache to ensure immediate update
        SubscriptionService._clear_subscription_cache(str(business.id))
        print('✅ Cache cleared for immediate update')
        
        print('\n🎉 SUCCESS! The dashboard should now display "Enterprise" in the DashAppBar')
        return True
        
    except Exception as e:
        print(f'❌ Error updating subscription: {e}')
        return False

if __name__ == '__main__':
    success = update_subscription()
    sys.exit(0 if success else 1)
"""
Django management command to update user subscription plan
Usage: python manage.py update_user_subscription email@example.com enterprise
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import User, UserProfile, Business, Subscription
from users.subscription_service import SubscriptionService


class Command(BaseCommand):
    help = 'Update subscription plan for a specific user'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='User email address')
        parser.add_argument('plan', type=str, choices=['free', 'professional', 'enterprise'], help='Subscription plan')
        parser.add_argument('--billing-cycle', type=str, default='monthly', choices=['monthly', 'yearly', '6months'], help='Billing cycle')

    def handle(self, *args, **options):
        email = options['email']
        plan = options['plan']
        billing_cycle = options['billing_cycle']
        
        self.stdout.write(f'Updating subscription for {email} to {plan}...')
        
        try:
            # Find the user
            user = User.objects.filter(email=email).first()
            if not user:
                self.stdout.write(self.style.ERROR(f'User {email} not found'))
                return
            
            # Get user profile
            profile = UserProfile.objects.filter(user=user).first()
            if not profile:
                self.stdout.write(self.style.ERROR('User profile not found'))
                return
            
            # Get the business
            business = Business.objects.filter(id=profile.business_id).first()
            if not business:
                self.stdout.write(self.style.ERROR('Business not found'))
                return
            
            self.stdout.write(f'Found business: {business.name} (ID: {business.id})')
            
            # Check current subscription
            current_sub = Subscription.objects.filter(business=business).first()
            if current_sub:
                self.stdout.write(f'Current subscription: {current_sub.selected_plan}')
            
            # Update or create subscription using the centralized service
            subscription = SubscriptionService.create_or_update_subscription(
                tenant_id=str(business.id),
                plan=plan,
                status='active',
                billing_cycle=billing_cycle
            )
            
            self.stdout.write(self.style.SUCCESS(f'✅ Subscription updated successfully!'))
            self.stdout.write(f'   Plan: {subscription.selected_plan}')
            self.stdout.write(f'   Billing Cycle: {subscription.billing_cycle if hasattr(subscription, "billing_cycle") else billing_cycle}')
            self.stdout.write(f'   Active: {subscription.is_active}')
            
            # Clear cache
            SubscriptionService._clear_subscription_cache(str(business.id))
            self.stdout.write(self.style.SUCCESS('✅ Cache cleared for immediate update'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error updating subscription: {e}'))
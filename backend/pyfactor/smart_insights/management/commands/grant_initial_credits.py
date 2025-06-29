from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from smart_insights.models import UserCredit, CreditTransaction
from decimal import Decimal

User = get_user_model()


class Command(BaseCommand):
    help = 'Grant initial free credits to existing users based on their subscription plan'
    
    def handle(self, *args, **options):
        users_updated = 0
        
        for user in User.objects.all():
            # Skip if user already has credits
            existing_credit = UserCredit.objects.filter(user=user).first()
            if existing_credit and existing_credit.balance > 0:
                continue
            
            # Determine credits based on plan
            subscription_plan = getattr(user, 'subscription_plan', 'free')
            
            if subscription_plan == 'free':
                initial_credits = 5
            elif subscription_plan == 'professional':
                initial_credits = 10
            elif subscription_plan == 'enterprise':
                initial_credits = 20
            else:
                initial_credits = 5  # Default to free plan credits
            
            # Create or update user credits
            user_credit, created = UserCredit.objects.get_or_create(
                user=user,
                defaults={'balance': initial_credits}
            )
            
            if created:
                # Record the grant transaction
                CreditTransaction.objects.create(
                    user=user,
                    transaction_type='bonus',  # Use 'bonus' which exists in the current model
                    amount=initial_credits,
                    balance_after=initial_credits,
                    description=f"Initial {subscription_plan} plan credits - Welcome bonus"
                )
                users_updated += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Granted {initial_credits} credits to {user.email} ({subscription_plan} plan)'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted! Granted initial credits to {users_updated} users.'
            )
        )
"""
Signal handlers for Smart Insights app to grant free credits to new users
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import UserCredit, CreditTransaction

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_save, sender=User)
def grant_initial_credits(sender, instance, created, **kwargs):
    """
    Automatically grant free credits to new users based on their subscription plan
    """
    if created:
        # Determine initial credits based on subscription plan
        subscription_plan = getattr(instance, 'subscription_plan', 'free')
        
        if subscription_plan == 'free':
            initial_credits = 5
        elif subscription_plan == 'professional':
            initial_credits = 10
        elif subscription_plan == 'enterprise':
            initial_credits = 20
        else:
            initial_credits = 5  # Default to free plan credits
        
        # Create UserCredit record with initial balance
        user_credit, credit_created = UserCredit.objects.get_or_create(
            user=instance,
            defaults={'balance': initial_credits}
        )
        
        if credit_created and initial_credits > 0:
            # Record the grant transaction
            CreditTransaction.objects.create(
                user=instance,
                transaction_type='bonus',
                amount=initial_credits,
                balance_after=initial_credits,
                description=f"Welcome bonus - {subscription_plan} plan ({initial_credits} free credits)"
            )
            
            logger.info(
                f"Granted {initial_credits} free credits to new user {instance.email} "
                f"({subscription_plan} plan)"
            )


@receiver(post_save, sender=User)
def update_credits_on_plan_change(sender, instance, created, **kwargs):
    """
    Handle subscription plan changes for existing users
    
    Note: This only grants credits if the user has never received any credits before.
    Plan upgrades don't grant additional free credits.
    """
    if not created:
        # Check if user has a UserCredit record
        try:
            user_credit = UserCredit.objects.get(user=instance)
            
            # If user already has credits or has had transactions, don't grant more
            if user_credit.total_purchased > 0 or user_credit.total_used > 0:
                return
                
            # If balance is 0 and no transactions, this might be a plan upgrade
            # for a user who never received initial credits
            if user_credit.balance == 0:
                transactions = CreditTransaction.objects.filter(user=instance).exists()
                if not transactions:
                    # User never received initial credits, grant them now
                    subscription_plan = getattr(instance, 'subscription_plan', 'free')
                    
                    if subscription_plan == 'free':
                        initial_credits = 5
                    elif subscription_plan == 'professional':
                        initial_credits = 10
                    elif subscription_plan == 'enterprise':
                        initial_credits = 20
                    else:
                        initial_credits = 5
                    
                    user_credit.balance = initial_credits
                    user_credit.save()
                    
                    # Record the grant transaction
                    CreditTransaction.objects.create(
                        user=instance,
                        transaction_type='bonus',
                        amount=initial_credits,
                        balance_after=initial_credits,
                        description=f"Initial credits granted - {subscription_plan} plan"
                    )
                    
                    logger.info(
                        f"Granted {initial_credits} initial credits to existing user {instance.email} "
                        f"who upgraded to {subscription_plan} plan"
                    )
                    
        except UserCredit.DoesNotExist:
            # User doesn't have a credit record yet, create one with initial credits
            # This handles edge cases where the first signal might have failed
            grant_initial_credits(sender, instance, True, **kwargs)
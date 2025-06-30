from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from smart_insights.models import UserCredit, CreditTransaction
from decimal import Decimal

User = get_user_model()


class Command(BaseCommand):
    help = 'Add test credits to a user account'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='User email address')
        parser.add_argument('credits', type=int, help='Number of credits to add')
        parser.add_argument(
            '--reason',
            type=str,
            default='Test credits',
            help='Reason for adding credits'
        )

    def handle(self, *args, **options):
        email = options['email']
        credits_to_add = options['credits']
        reason = options['reason']
        
        try:
            # Find the user
            user = User.objects.get(email=email)
            self.stdout.write(f"Found user: {user.email}")
            
            # Get or create user credit record
            user_credit, created = UserCredit.objects.get_or_create(
                user=user,
                defaults={'balance': 0}
            )
            
            # Store current balance
            old_balance = user_credit.balance
            
            # Add credits
            user_credit.add_credits(credits_to_add)
            
            # Create transaction record
            CreditTransaction.objects.create(
                user=user,
                transaction_type='grant',
                amount=credits_to_add,
                balance_before=old_balance,
                balance_after=user_credit.balance,
                description=f"{reason}: Added {credits_to_add} credits by admin"
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n✅ Successfully added {credits_to_add} credits to {email}\n"
                    f"   Previous balance: {old_balance}\n"
                    f"   New balance: {user_credit.balance}\n"
                    f"   Reason: {reason}"
                )
            )
            
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"❌ User with email '{email}' not found")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Error adding credits: {str(e)}")
            )
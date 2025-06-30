from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from smart_insights.models import UserCredit, CreditTransaction
from django.db import transaction as db_transaction
from django.utils import timezone

User = get_user_model()


class Command(BaseCommand):
    help = 'Grant 200 test credits to kdeng@dottapps.com'

    def handle(self, *args, **options):
        email = 'kdeng@dottapps.com'
        credits_to_add = 200
        
        try:
            with db_transaction.atomic():
                # Find the user
                user = User.objects.get(email=email)
                
                # Get or create user credit record
                user_credit, created = UserCredit.objects.get_or_create(
                    user=user,
                    defaults={
                        'balance': credits_to_add,
                        'total_purchased': credits_to_add
                    }
                )
                
                if not created:
                    # Store current balance
                    old_balance = user_credit.balance
                    
                    # Add credits
                    user_credit.balance += credits_to_add
                    user_credit.total_purchased += credits_to_add
                    user_credit.save()
                    
                    # Create transaction record
                    CreditTransaction.objects.create(
                        user=user,
                        transaction_type='grant',
                        amount=credits_to_add,
                        balance_before=old_balance,
                        balance_after=user_credit.balance,
                        description=f"Test credits granted for Smart Insights testing"
                    )
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"\n✅ Successfully added {credits_to_add} credits to {email}\n"
                            f"   Previous balance: {old_balance}\n"
                            f"   New balance: {user_credit.balance}\n"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"\n✅ Created new credit account for {email} with {credits_to_add} credits\n"
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
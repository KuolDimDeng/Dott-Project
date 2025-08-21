from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from smart_insights.models import UserCredit
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Update Smart Insights credits for a user'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='User email address')
        parser.add_argument('credits', type=int, help='Number of credits to set')

    def handle(self, *args, **options):
        email = options['email']
        credits = options['credits']
        
        self.stdout.write(f"Updating credits for {email} to {credits}...")
        
        try:
            with transaction.atomic():
                user = User.objects.filter(email=email).first()
                
                if not user:
                    self.stdout.write(self.style.ERROR(f"User {email} not found"))
                    return
                
                # Get or create UserCredit
                credit, created = UserCredit.objects.get_or_create(
                    user=user,
                    defaults={
                        'balance': credits,
                        'total_purchased': 0,
                        'total_used': 0
                    }
                )
                
                if not created:
                    old_balance = credit.balance
                    credit.balance = credits
                    credit.save()
                    self.stdout.write(self.style.SUCCESS(
                        f"Updated {email} credits from {old_balance} to {credits}"
                    ))
                else:
                    self.stdout.write(self.style.SUCCESS(
                        f"Created credit record for {email} with {credits} credits"
                    ))
                
                # Display current status
                self.stdout.write(self.style.SUCCESS(f"\nCurrent Status:"))
                self.stdout.write(f"  Balance: {credit.balance}")
                self.stdout.write(f"  Total Purchased: {credit.total_purchased}")
                self.stdout.write(f"  Total Used: {credit.total_used}")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))
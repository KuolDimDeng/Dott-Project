from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from onboarding.models import OnboardingProgress
from users.models import UserProfile
from business.models import Business, Subscription
from finance.models import Account

User = get_user_model()

class Command(BaseCommand):
    help = 'Clears onboarding data and related user information for testing purposes'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Specific email to clear data for')

    def handle(self, *args, **options):
        email = options['email']

        # List users in onboarding
        self.list_onboarding_users(email)

        # Confirmation prompt
        confirmation = input("Are you sure you want to delete onboarding data? Type 'yes' to confirm: ")
        if confirmation.lower() != 'yes':
            self.stdout.write(self.style.WARNING('Operation cancelled.'))
            return

        with transaction.atomic():
            if email:
                self.clear_user_data(email)
            else:
                self.clear_all_data()

        self.stdout.write(self.style.SUCCESS('Successfully cleared onboarding data'))

    def list_onboarding_users(self, email=None):
        self.stdout.write(self.style.NOTICE("Users in onboarding:"))
        if email:
            onboarding_users = OnboardingProgress.objects.filter(email=email)
        else:
            onboarding_users = OnboardingProgress.objects.all()
        
        if not onboarding_users:
            self.stdout.write("No users found in onboarding.")
        else:
            for onboarding in onboarding_users:
                user_info = f"Email: {onboarding.email}, Step: {onboarding.current_step}"
                if onboarding.first_name and onboarding.last_name:
                    user_info += f", Name: {onboarding.first_name} {onboarding.last_name}"
                self.stdout.write(user_info)

    def clear_user_data(self, email):
        try:
            user = User.objects.get(email=email)
            self.delete_user_related_data(user)
            user.delete()
            self.stdout.write(f"Cleared data for user: {email}")
        except User.DoesNotExist:
            self.stdout.write(f"User with email {email} not found")

    def clear_all_data(self):
        users = User.objects.all()
        for user in users:
            self.delete_user_related_data(user)
        User.objects.all().delete()
        self.stdout.write("Cleared all user data")

    def delete_user_related_data(self, user):
        OnboardingProgress.objects.filter(user_id=user.id).delete()
        UserProfile.objects.filter(user=user).delete()
        businesses = Business.objects.filter(owner=user)
        for business in businesses:
            Subscription.objects.filter(business=business).delete()
            Account.objects.filter(business=business).delete()
        businesses.delete()
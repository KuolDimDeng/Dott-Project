"""
Django management command to create missing UserProfile for users.
Specifically created to fix the support@dottapps.com user issue.
"""
import uuid
from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from custom_auth.models import User
from users.models import UserProfile, Business


class Command(BaseCommand):
    help = 'Create missing UserProfile for users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email of the user to create UserProfile for',
            required=False
        )
        parser.add_argument(
            '--business-id',
            type=str,
            help='Business ID to associate with the UserProfile',
            required=False
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Create UserProfiles for all users missing them'
        )

    def handle(self, *args, **options):
        email = options.get('email')
        business_id = options.get('business_id')
        create_all = options.get('all')

        if create_all:
            self.create_all_missing_profiles()
        elif email:
            self.create_profile_for_user(email, business_id)
        else:
            # Default case: fix support@dottapps.com
            self.stdout.write(
                self.style.WARNING('No arguments provided. Checking support@dottapps.com...')
            )
            self.create_profile_for_user(
                'support@dottapps.com', 
                '05ce07dc-929f-404c-bef0-7f4692da95be'
            )

    def create_profile_for_user(self, email, business_id=None):
        """Create UserProfile for a specific user"""
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"Found user: {user.email} (ID: {user.id})")
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User with email {email} not found')
            )
            return

        # Check if profile already exists
        if hasattr(user, 'profile'):
            self.stdout.write(
                self.style.WARNING(f'UserProfile already exists for {email}')
            )
            self.stdout.write(f"  - Business ID: {user.profile.business_id}")
            self.stdout.write(f"  - Profile ID: {user.profile.id}")
            return

        # Validate business if ID provided
        business = None
        if business_id:
            try:
                business_id_uuid = uuid.UUID(business_id)
                business = Business.objects.get(id=business_id_uuid)
                self.stdout.write(f"Found business: {business.name} (ID: {business.id})")
            except (ValueError, Business.DoesNotExist):
                self.stdout.write(
                    self.style.ERROR(f'Invalid or non-existent business ID: {business_id}')
                )
                return

        # Create UserProfile
        with db_transaction.atomic():
            try:
                profile = UserProfile.objects.create(
                    user=user,
                    business_id=business_id_uuid if business_id else None,
                    # Set default values based on what we see in the code
                    occupation='',
                    street='',
                    city='',
                    state='',
                    postcode='',
                    country='US',
                    phone_number='',
                    show_whatsapp_commerce=None,
                    display_legal_structure=True
                )
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully created UserProfile for {email}'
                    )
                )
                self.stdout.write(f"  - Profile ID: {profile.id}")
                self.stdout.write(f"  - Business ID: {profile.business_id}")
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error creating UserProfile: {str(e)}')
                )

    def create_all_missing_profiles(self):
        """Create UserProfiles for all users missing them"""
        users_without_profile = User.objects.filter(profile__isnull=True)
        count = users_without_profile.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('All users already have UserProfiles')
            )
            return

        self.stdout.write(f"Found {count} users without UserProfiles:")
        
        created_count = 0
        error_count = 0
        
        for user in users_without_profile:
            self.stdout.write(f"\nProcessing user: {user.email}")
            
            # Try to find their business through their User.business_id field
            business_id = None
            if hasattr(user, 'business_id') and user.business_id:
                business_id = user.business_id
                self.stdout.write(f"  - Found business_id on User model: {business_id}")
            
            with db_transaction.atomic():
                try:
                    profile = UserProfile.objects.create(
                        user=user,
                        business_id=business_id,
                        occupation='',
                        street='',
                        city='',
                        state='',
                        postcode='',
                        country='US',
                        phone_number=''
                    )
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"  ✓ Created UserProfile (ID: {profile.id})")
                    )
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f"  ✗ Error: {str(e)}")
                    )

        self.stdout.write("\n" + "="*50)
        self.stdout.write(
            self.style.SUCCESS(f"Created {created_count} UserProfiles")
        )
        if error_count > 0:
            self.stdout.write(
                self.style.ERROR(f"Failed to create {error_count} UserProfiles")
            )
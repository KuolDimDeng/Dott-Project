from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models import UserProfile
from django.db import transaction as db_transaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Fix all users with incorrect business_id by updating from UserProfile'

    def handle(self, *args, **options):
        self.stdout.write("=" * 80)
        self.stdout.write("FIXING USER BUSINESS IDS")
        self.stdout.write("=" * 80)
        
        # Get all users with business_id set
        users_with_business = User.objects.exclude(business_id__isnull=True)
        self.stdout.write(f"\nFound {users_with_business.count()} users with business_id")
        
        fixed_count = 0
        error_count = 0
        
        for user in users_with_business:
            try:
                # Get user's profile
                profile = UserProfile.objects.select_related('business').get(user=user)
                
                if profile.business:
                    # Check if business_id is incorrect
                    if str(user.business_id) != str(profile.business.id):
                        old_business_id = user.business_id
                        user.business_id = profile.business.id
                        user.save(update_fields=['business_id'])
                        
                        self.stdout.write(
                            f"Fixed {user.email}: {old_business_id} -> {profile.business.id}"
                        )
                        fixed_count += 1
                    else:
                        self.stdout.write(f"✓ {user.email}: business_id is correct")
                else:
                    self.stdout.write(f"⚠ {user.email}: UserProfile has no business")
                    
            except UserProfile.DoesNotExist:
                self.stdout.write(f"⚠ {user.email}: No UserProfile found")
                error_count += 1
            except Exception as e:
                self.stdout.write(f"✗ {user.email}: Error - {str(e)}")
                error_count += 1
        
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write(f"Summary:")
        self.stdout.write(f"  Fixed: {fixed_count} users")
        self.stdout.write(f"  Errors: {error_count} users")
        self.stdout.write(f"  Total checked: {users_with_business.count()} users")
        
        # Also check for users without business_id but with UserProfile
        self.stdout.write("\n" + "-" * 80)
        self.stdout.write("Checking users without business_id...")
        
        users_without_business = User.objects.filter(business_id__isnull=True)
        missing_business_count = 0
        
        for user in users_without_business:
            try:
                profile = UserProfile.objects.select_related('business').get(user=user)
                if profile.business:
                    user.business_id = profile.business.id
                    user.save(update_fields=['business_id'])
                    self.stdout.write(f"Added business_id for {user.email}: {profile.business.id}")
                    missing_business_count += 1
            except UserProfile.DoesNotExist:
                pass
            except Exception as e:
                self.stdout.write(f"Error checking {user.email}: {str(e)}")
        
        if missing_business_count > 0:
            self.stdout.write(f"\nAdded business_id for {missing_business_count} users")
        
        self.stdout.write("\n✅ Business ID fix complete!")
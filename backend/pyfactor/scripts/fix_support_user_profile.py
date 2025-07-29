#!/usr/bin/env python
"""
Script to create missing UserProfile for support@dottapps.com user.
This fixes the "User profile not found" error when uploading logos.

Usage:
    python scripts/fix_support_user_profile.py
    
Or from Django shell:
    python manage.py shell < scripts/fix_support_user_profile.py
"""

import os
import sys
import django
import uuid

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from custom_auth.models import User
from users.models import UserProfile, Business


def fix_support_user_profile():
    """Create UserProfile for support@dottapps.com user"""
    
    email = 'support@dottapps.com'
    business_id = '05ce07dc-929f-404c-bef0-7f4692da95be'
    
    print(f"\n{'='*60}")
    print(f"Fixing UserProfile for {email}")
    print(f"{'='*60}\n")
    
    try:
        # Get the user
        user = User.objects.get(email=email)
        print(f"✓ Found user: {user.email}")
        print(f"  - User ID: {user.id}")
        print(f"  - Username: {user.username}")
        print(f"  - Role: {user.role}")
        print(f"  - Business ID (from User): {getattr(user, 'business_id', 'Not set')}")
        
    except User.DoesNotExist:
        print(f"✗ ERROR: User with email {email} not found!")
        return False
    
    # Check if profile already exists
    if hasattr(user, 'profile'):
        print(f"\n⚠️  UserProfile already exists for {email}")
        profile = user.profile
        print(f"  - Profile ID: {profile.id}")
        print(f"  - Business ID: {profile.business_id}")
        print(f"  - Country: {profile.country}")
        
        # Check if business_id matches
        if str(profile.business_id) != business_id:
            print(f"\n⚠️  WARNING: Profile business_id ({profile.business_id}) doesn't match expected ({business_id})")
            response = input("Do you want to update the business_id? (y/N): ")
            if response.lower() == 'y':
                profile.business_id = uuid.UUID(business_id)
                profile.save()
                print(f"✓ Updated business_id to {business_id}")
        
        return True
    
    # First check if user owns any businesses
    user_businesses = Business.objects.filter(owner_id=user.id)
    if user_businesses.exists():
        print(f"\n✓ User owns {user_businesses.count()} business(es):")
        for idx, biz in enumerate(user_businesses):
            print(f"  {idx+1}. {biz.name} (ID: {biz.id})")
        
        if user_businesses.count() == 1:
            business_uuid = user_businesses.first().id
            print(f"\n✓ Using user's business: {user_businesses.first().name}")
        else:
            print("\nMultiple businesses found. Please select one:")
            choice = input("Enter number (or press Enter to skip): ")
            if choice.isdigit() and 1 <= int(choice) <= user_businesses.count():
                business_uuid = list(user_businesses)[int(choice)-1].id
            else:
                business_uuid = None
    else:
        # Verify the business exists
        print(f"\nUser doesn't own any businesses. Checking business {business_id}...")
        try:
            business_uuid = uuid.UUID(business_id)
            business = Business.objects.get(id=business_uuid)
            print(f"✓ Found business: {business.name}")
            print(f"  - Business Type: {business.business_type}")
            print(f"  - Owner ID: {business.owner_id}")
            
        except (ValueError, Business.DoesNotExist):
            print(f"✗ ERROR: Business with ID {business_id} not found!")
            print("\nOptions:")
            print("1. Continue without business association")
            print("2. Exit and create a business first")
            response = input("Choose (1/2): ")
            if response != '1':
                return False
            business_uuid = None
    
    # Create UserProfile
    print(f"\nCreating UserProfile...")
    with transaction.atomic():
        try:
            profile = UserProfile.objects.create(
                user=user,
                business_id=business_uuid,
                occupation='',
                street='',
                city='',
                state='',
                postcode='',
                country='US',
                phone_number='',
                show_whatsapp_commerce=None,  # Will use country default
                display_legal_structure=True  # Default value from model
            )
            
            print(f"\n✓ SUCCESS: Created UserProfile for {email}")
            print(f"  - Profile ID: {profile.id}")
            print(f"  - Business ID: {profile.business_id}")
            print(f"  - Country: {profile.country}")
            
            # Update user.business_id if needed
            if hasattr(user, 'business_id') and not user.business_id and business_uuid:
                user.business_id = business_uuid
                user.save()
                print(f"  - Also updated User.business_id to {business_uuid}")
            
            return True
            
        except Exception as e:
            print(f"\n✗ ERROR creating UserProfile: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


def check_all_users_without_profiles():
    """Check for any other users without profiles"""
    users_without_profile = User.objects.filter(profile__isnull=True)
    count = users_without_profile.count()
    
    if count > 0:
        print(f"\n⚠️  Found {count} other users without UserProfiles:")
        for user in users_without_profile[:10]:  # Show first 10
            print(f"  - {user.email} (ID: {user.id})")
        
        if count > 10:
            print(f"  ... and {count - 10} more")
        
        print("\nTo fix all users, run:")
        print("  python manage.py create_missing_userprofile --all")


if __name__ == '__main__':
    # Run the fix
    success = fix_support_user_profile()
    
    if success:
        print(f"\n{'='*60}")
        print("✓ UserProfile fix completed successfully!")
        print(f"{'='*60}")
        
        # Check for other users
        check_all_users_without_profiles()
    else:
        print(f"\n{'='*60}")
        print("✗ UserProfile fix failed!")
        print(f"{'='*60}")
        sys.exit(1)
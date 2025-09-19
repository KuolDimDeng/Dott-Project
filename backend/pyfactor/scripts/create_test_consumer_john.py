#!/usr/bin/env python
"""
Create test consumer account for John Peter
Phone: +211921234567
"""
import os
import sys
import django

# Setup Django
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from users.models import User, UserProfile
from marketplace.models import ConsumerProfile
from django.utils import timezone
import uuid

def create_consumer_account():
    """Create consumer test account for John Peter"""

    phone = '+211921234567'
    email = 'johnpeter.test@dottapps.com'
    first_name = 'John'
    last_name = 'Peter'

    try:
        with transaction.atomic():
            # Check if user already exists
            existing_user = User.objects.filter(phone=phone).first()
            if not existing_user:
                existing_user = User.objects.filter(email=email).first()

            if existing_user:
                print(f"✅ User already exists: {existing_user.email}")
                # Update names if needed
                existing_user.first_name = first_name
                existing_user.last_name = last_name
                existing_user.name = f"{first_name} {last_name}"
                existing_user.phone = phone
                existing_user.is_consumer = True
                existing_user.save()

                # Ensure user profile exists
                user_profile, _ = UserProfile.objects.get_or_create(
                    user=existing_user,
                    defaults={
                        'phone': phone,
                        'first_name': first_name,
                        'last_name': last_name,
                        'country': 'SS',
                        'country_name': 'South Sudan',
                        'city': 'Juba',
                        'is_consumer': True,
                        'onboarding_completed': True,
                        'setup_done': True,
                        'selected_plan': 'free',
                        'subscription_type': 'free',
                        'subscription_plan': 'free'
                    }
                )

                # Ensure consumer profile exists
                consumer_profile, created = ConsumerProfile.objects.get_or_create(
                    user=existing_user,
                    defaults={
                        'preferred_payment_method': 'card',
                        'current_city': 'Juba',
                        'current_country': 'SS',
                        'phone': phone,
                        'delivery_addresses': [{
                            'id': str(uuid.uuid4()),
                            'name': 'Home',
                            'street': '123 Main Street',
                            'city': 'Juba',
                            'state': 'Central Equatoria',
                            'country': 'South Sudan',
                            'postal_code': '00000',
                            'is_default': True
                        }]
                    }
                )
                if created:
                    print("✅ Consumer profile created")
                return existing_user

            # Create new user
            print(f"Creating consumer account for {first_name} {last_name}...")

            # Generate a unique tenant_id
            tenant_id = uuid.uuid4()

            # Create user
            user = User.objects.create(
                email=email,
                phone=phone,
                first_name=first_name,
                last_name=last_name,
                name=f"{first_name} {last_name}",
                is_active=True,
                is_consumer=True,
                is_business=False,
                role='USER',
                tenant_id=tenant_id,
                business_id=tenant_id
            )

            # Set password
            user.set_password('Test123!')
            user.save()
            print(f"✅ User created: {user.email}")

            # Create user profile
            profile = UserProfile.objects.create(
                user=user,
                phone=phone,
                first_name=first_name,
                last_name=last_name,
                country='SS',
                country_name='South Sudan',
                city='Juba',
                is_consumer=True,
                onboarding_completed=True,
                setup_done=True,
                selected_plan='free',
                subscription_type='free',
                subscription_plan='free',
                business_id=tenant_id
            )
            print(f"✅ User profile created")

            # Create consumer profile
            consumer_profile = ConsumerProfile.objects.create(
                user=user,
                preferred_payment_method='card',
                current_city='Juba',
                current_country='SS',
                phone=phone,
                delivery_addresses=[{
                    'id': str(uuid.uuid4()),
                    'name': 'Home',
                    'street': '123 Main Street',
                    'city': 'Juba',
                    'state': 'Central Equatoria',
                    'country': 'South Sudan',
                    'postal_code': '00000',
                    'is_default': True
                }]
            )
            print(f"✅ Consumer profile created")

            print("\n" + "="*50)
            print("✅ CONSUMER ACCOUNT CREATED SUCCESSFULLY!")
            print("="*50)
            print(f"Phone: {phone}")
            print(f"Email: {email}")
            print(f"Password: Test123!")
            print(f"Name: {first_name} {last_name}")
            print(f"Location: Juba, South Sudan")
            print("="*50)

            return user

    except Exception as e:
        print(f"❌ Error creating consumer account: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    user = create_consumer_account()
    if user:
        print(f"\n✅ Consumer account ready for testing!")
        print(f"Use phone number {user.phone} to sign in")
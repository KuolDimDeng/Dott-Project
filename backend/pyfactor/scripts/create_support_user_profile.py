#!/usr/bin/env python
"""
Script to create a UserProfile for support@dottapps.com user
This ensures the support user can access all features including menu management
"""

import os
import sys
import django
from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

# Setup Django environment
# Add the parent directory to the path so we can import pyfactor
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserProfile, Business, BusinessDetails
from custom_auth.models import Tenant
from django.db import transaction

User = get_user_model()

def create_support_user_profile():
    """Create UserProfile and Business for support@dottapps.com"""
    try:
        with transaction.atomic():
            # Find the support user
            support_user = User.objects.filter(email='support@dottapps.com').first()
            
            if not support_user:
                print("❌ Support user (support@dottapps.com) not found!")
                return False
            
            print(f"✅ Found support user: {support_user.email} (ID: {support_user.id})")
            
            # Check if UserProfile already exists (it's related_name='profile' not 'userprofile')
            if hasattr(support_user, 'profile'):
                print(f"⚠️ UserProfile already exists for {support_user.email}")
                profile = support_user.profile
            else:
                # Create UserProfile with only fields that exist
                profile = UserProfile.objects.create(
                    user=support_user,
                    phone_number='+211912345678',  # South Sudan phone
                    country='SS',  # South Sudan
                    city='Juba',
                    state='Central Equatoria',
                    occupation='Support Team',
                    show_whatsapp_commerce=True
                )
                print(f"✅ Created UserProfile for {support_user.email}")
            
            # Check if Business exists
            if not profile.business:
                # Try to find existing "Dott Restaurant & Cafe" business
                business = Business.objects.filter(name__icontains='Dott Restaurant').first()
                
                if not business:
                    # Get or create a tenant
                    tenant = Tenant.objects.first()
                    if not tenant:
                        tenant = Tenant.objects.create(
                            name='Dott Support Tenant',
                            domain='support.dottapps.com',
                            schema_name='public',
                            is_active=True
                        )
                        print(f"✅ Created tenant: {tenant.name}")
                    
                    # Create the business
                    business = Business.objects.create(
                        tenant=tenant,
                        name='Dott Restaurant & Cafe',
                        business_type='RESTAURANT_CAFE',
                        simplified_business_type='RESTAURANT',
                        email='support@dottapps.com',
                        phone='+211912345678',
                        address='123 Main Street',
                        city='Juba',
                        state='Central Equatoria',
                        country='SS',
                        postal_code='00211',
                        website='https://dottapps.com',
                        description='Demo restaurant for testing and support',
                        is_active=True,
                        accepts_online_orders=True,
                        offers_delivery=True,
                        offers_pickup=True,
                        delivery_radius=10.0,
                        minimum_order_amount=10.00,
                        delivery_fee=5.00,
                        estimated_delivery_time=30,
                        operating_hours={
                            'monday': {'open': '08:00', 'close': '22:00'},
                            'tuesday': {'open': '08:00', 'close': '22:00'},
                            'wednesday': {'open': '08:00', 'close': '22:00'},
                            'thursday': {'open': '08:00', 'close': '22:00'},
                            'friday': {'open': '08:00', 'close': '23:00'},
                            'saturday': {'open': '09:00', 'close': '23:00'},
                            'sunday': {'open': '09:00', 'close': '21:00'}
                        }
                    )
                    print(f"✅ Created business: {business.name}")
                    
                    # Create BusinessDetails
                    details = BusinessDetails.objects.create(
                        business=business,
                        simplified_business_type='RESTAURANT',
                        business_type='RESTAURANT_CAFE',
                        industry='Food & Beverage',
                        founded_year=2024,
                        number_of_employees='1-10',
                        annual_revenue='Under $100K',
                        tax_id='123456789',
                        business_registration_number='REG123456',
                        accepts_credit_cards=True,
                        accepts_mobile_money=True,
                        accepts_cash=True,
                        has_parking=True,
                        has_wifi=True,
                        is_wheelchair_accessible=True,
                        has_outdoor_seating=True,
                        allows_pets=False,
                        offers_catering=True,
                        has_bar=True,
                        has_live_music=False,
                        requires_reservations=False,
                        good_for_groups=True,
                        good_for_kids=True,
                        cuisines=['African', 'International'],
                        dietary_options=['Vegetarian', 'Vegan', 'Gluten-Free'],
                        price_range='$$',
                        social_media={
                            'facebook': 'https://facebook.com/dottapps',
                            'twitter': 'https://twitter.com/dottapps',
                            'instagram': 'https://instagram.com/dottapps'
                        }
                    )
                    print(f"✅ Created business details")
                else:
                    print(f"✅ Found existing business: {business.name}")
                
                # Link business to profile
                profile.business = business
                profile.save()
                print(f"✅ Linked business to UserProfile")
            else:
                print(f"✅ UserProfile already has business: {profile.business.name}")
            
            # Ensure user has tenant_id
            if not hasattr(support_user, 'tenant_id') or not support_user.tenant_id:
                if profile.business and hasattr(profile.business, 'tenant_id'):
                    support_user.tenant_id = profile.business.tenant_id
                    support_user.save()
                    print(f"✅ Set tenant_id for support user: {support_user.tenant_id}")
                elif tenant:
                    support_user.tenant_id = tenant.id
                    support_user.save()
                    print(f"✅ Set tenant_id for support user: {support_user.tenant_id}")
            
            print("\n🎉 Successfully set up support user profile!")
            print(f"   User: {support_user.email}")
            print(f"   Profile: {profile.occupation if hasattr(profile, 'occupation') else 'Support'}")
            print(f"   Business: {profile.business.name if profile.business else 'None'}")
            print(f"   Tenant ID: {support_user.tenant_id if hasattr(support_user, 'tenant_id') else 'None'}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error creating support user profile: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = create_support_user_profile()
    sys.exit(0 if success else 1)
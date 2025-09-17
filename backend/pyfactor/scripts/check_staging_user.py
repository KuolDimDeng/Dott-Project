#!/usr/bin/env python3
"""
Direct connection to staging database to check user setup
Run with: python3 scripts/check_staging_user.py
"""

import os
import sys
import django
from pathlib import Path

# Add the parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Setup Django with staging database
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Override database settings to connect to staging
from django.conf import settings
settings.DATABASES['default'] = {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': 'pyfactor_staging',
    'USER': 'pyfactor_staging_user',
    'PASSWORD': 'lkr0Xl0q5fMxCa5uJKKu8YGNhJ1XPJ2n',
    'HOST': 'dpg-cu8mhf56l47c73c15dgg-a.oregon-postgres.render.com',
    'PORT': '5432',
    'OPTIONS': {
        'sslmode': 'require',
    },
}

django.setup()

from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from users.models import UserProfile

User = get_user_model()

# Test user email
test_email = "phone_211925550100@dottapps.com"

print("\n" + "="*60)
print("CHECKING STAGING DATABASE - USER AND TENANT SETUP")
print("="*60)

try:
    user = User.objects.get(email=test_email)
    print(f"\n✅ User found: {user.email}")
    print(f"   - ID: {user.id}")
    print(f"   - Phone: {user.phone_number}")
    print(f"   - Has tenant: {'Yes' if user.tenant else 'No'}")
    if user.tenant:
        print(f"   - Tenant ID: {user.tenant.id}")
        print(f"   - Tenant Name: {user.tenant.name}")
    print(f"   - Onboarding completed: {user.onboarding_completed}")
    
    # Check UserProfile
    try:
        profile = UserProfile.objects.get(user=user)
        print(f"\n✅ UserProfile found:")
        print(f"   - User Mode: {profile.user_mode if hasattr(profile, 'user_mode') else 'Field not found'}")
        print(f"   - Has Consumer Access: {profile.has_consumer_access if hasattr(profile, 'has_consumer_access') else 'Field not found'}")
        print(f"   - Has Business Access: {profile.has_business_access if hasattr(profile, 'has_business_access') else 'Field not found'}")
        print(f"   - Tenant ID in profile: {profile.tenant_id if profile.tenant_id else 'None'}")
    except UserProfile.DoesNotExist:
        print(f"\n❌ UserProfile not found")
        
except User.DoesNotExist:
    print(f"\n❌ User not found: {test_email}")
    print("   User needs to be created first by logging in with phone +211925550100")
except Exception as e:
    print(f"\n❌ Error: {e}")

print("\n" + "="*60)
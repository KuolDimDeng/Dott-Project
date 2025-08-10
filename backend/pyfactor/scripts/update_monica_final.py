#!/usr/bin/env python
"""
Final update for Monica Deng's profile with South Sudan.
"""
import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserProfile, BusinessDetails
from custom_auth.models import Tenant

User = get_user_model()

# Find the user
user = User.objects.get(email='jubacargovillage@outlook.com')

# Update user name
user.first_name = 'Monica'
user.last_name = 'Deng'
user.save()
print(f'✅ Updated user name to Monica Deng')

# Update UserProfile if exists
try:
    profile = UserProfile.objects.get(user=user)
    profile.first_name = 'Monica'
    profile.last_name = 'Deng'
    profile.save()
    print(f'✅ Updated UserProfile')
except UserProfile.DoesNotExist:
    UserProfile.objects.create(
        user=user,
        first_name='Monica',
        last_name='Deng'
    )
    print(f'✅ Created UserProfile')

# Update tenant
if user.tenant_id:
    tenant = Tenant.objects.get(id=user.tenant_id)
    tenant.name = 'Juba Cargo Village'
    tenant.country = 'SS'  # ISO code for South Sudan
    tenant.save()
    print(f'✅ Updated tenant to South Sudan (SS)')
    
    # Update or create BusinessDetails
    bd, created = BusinessDetails.objects.update_or_create(
        business_id=user.tenant_id,
        defaults={
            'country': 'SS',  # ISO code for South Sudan
            'preferred_currency_code': 'SSP',
            'preferred_currency_name': 'South Sudanese Pound',
            'preferred_currency_symbol': 'SSP',
        }
    )
    if created:
        print(f'✅ Created BusinessDetails for South Sudan')
    else:
        print(f'✅ Updated BusinessDetails to South Sudan')

print('\n' + '='*50)
print('📊 Monica Deng\'s Final Profile:')
print('='*50)
print(f'Name: Monica Deng')
print(f'Email: jubacargovillage@outlook.com')
print(f'Business: Juba Cargo Village')
print(f'Country: South Sudan (ISO: SS)')
print(f'Currency: SSP (South Sudanese Pound)')
print(f'Tenant ID: {user.tenant_id}')
print('='*50)
print('✅ Profile update completed successfully!')
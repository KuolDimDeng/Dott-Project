#!/usr/bin/env python3

import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import Business, BusinessDetails
from custom_auth.models import User
import uuid

# Check the specific business
business_id = uuid.UUID('05ce07dc-929f-404c-bef0-7f4692da95be')
business = Business.objects.filter(id=business_id).first()

if business:
    print(f'✅ Business found: {business.name}')
    print(f'   ID: {business.id}')
    print(f'   Owner ID: {business.owner_id}')
    print(f'   Country: {business.country}')
    print(f'   Currency Code: {business.preferred_currency_code}')
    print(f'   Currency Name: {business.preferred_currency_name}')
    print(f'   Currency Symbol: {business.preferred_currency_symbol}')
    print(f'   Tenant ID: {business.tenant_id}')
    print(f'   Is Active: {business.is_active}')
    
    # Check BusinessDetails
    details = BusinessDetails.objects.filter(business=business).first()
    if details:
        print(f'\n📋 BusinessDetails found:')
        print(f'   Country: {details.country}')
        print(f'   Currency: {details.preferred_currency_code}')
    
    # Check if it's South Sudan
    if str(business.country) == 'SS' or (details and str(details.country) == 'SS'):
        print('\n🌍 This is a South Sudan business')
        if business.preferred_currency_code != 'SSP':
            print(f'  ⚠️ Should use SSP but using {business.preferred_currency_code}')
            print('  Updating to SSP...')
            from currency.currency_detection import detect_currency_for_country
            currency_info = detect_currency_for_country('SS')
            business.preferred_currency_code = currency_info['code']
            business.preferred_currency_name = currency_info['name']
            business.preferred_currency_symbol = currency_info['symbol']
            business.save()
            print(f'  ✅ Business updated to {currency_info}')
            
            # Also update BusinessDetails for backward compatibility
            if details:
                details.preferred_currency_code = currency_info['code']
                details.preferred_currency_name = currency_info['name']
                details.preferred_currency_symbol = currency_info['symbol']
                details.save()
                print(f'  ✅ BusinessDetails updated to {currency_info}')
        else:
            print('  ✅ Correctly using SSP')
else:
    print('❌ Business not found')

# Also check via user
print('\n' + '='*60)
user = User.objects.filter(email='support@dottapps.com').first()
if user:
    print(f'User: {user.email}')
    if hasattr(user, 'business_id') and user.business_id:
        print(f'User business_id: {user.business_id}')
        if str(user.business_id) == str(business_id):
            print('✅ User business_id matches the business we found')
            
            # Update user's business relationship
            if business and business.owner_id != user.id:
                print(f'⚠️ Business owner_id ({business.owner_id}) != user.id ({user.id})')
                print('  Fixing owner relationship...')
                business.owner_id = user.id
                business.save()
                print('  ✅ Business owner_id updated')
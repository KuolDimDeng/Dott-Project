#!/usr/bin/env python3

import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Test the currency API with improved business model
from custom_auth.models import User
from users.business_utils import get_user_business, get_business_currency

# Get the support@dottapps.com user
user = User.objects.filter(email='support@dottapps.com').first()
if user:
    print(f'✅ Found user: {user.email}')
    print(f'   User ID: {user.id}')
    
    # Get business using improved utility (bypass cache due to Redis connection issue)
    business = get_user_business(user, use_cache=False)
    if business:
        print(f'✅ Found business: {business.name}')
        print(f'   Business ID: {business.id}')
        print(f'   Country: {business.country}')
        print(f'   Currency Code: {business.preferred_currency_code}')
        print(f'   Currency Name: {business.preferred_currency_name}')
        print(f'   Currency Symbol: {business.preferred_currency_symbol}')
        print(f'   Tenant ID: {business.tenant_id}')
        print(f'   Is RLS compliant: {business.tenant_id == business.id}')
        
        # Test currency utility
        currency = get_business_currency(business)
        print(f'\n📊 Currency from utility:')
        print(f'   {currency}')
        
        # Check if SSP needs to be set
        if str(business.country) == 'SS' and business.preferred_currency_code != 'SSP':
            print(f'\n⚠️  South Sudan business should use SSP, currently: {business.preferred_currency_code}')
            print('   Updating to SSP...')
            from currency.currency_detection import detect_currency_for_country
            currency_info = detect_currency_for_country('SS')
            business.preferred_currency_code = currency_info['code']
            business.preferred_currency_name = currency_info['name']
            business.preferred_currency_symbol = currency_info['symbol']
            business.save()
            print(f'   ✅ Updated to {currency_info}')
        elif str(business.country) == 'SS':
            print(f'\n✅ South Sudan business correctly using SSP')
    else:
        print('❌ No business found for user')
else:
    print('❌ User support@dottapps.com not found')
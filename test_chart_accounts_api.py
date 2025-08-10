#!/usr/bin/env python3
"""
Test script to verify the Chart of Accounts API is working properly
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', 'pyfactor'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.test import RequestFactory
from finance.views import chart_of_accounts
from users.models import User, UserProfile
from finance.models import ChartOfAccount
from django.db.models import Count

# Get the support user
try:
    user = User.objects.get(email='support@dottapps.com')
    profile = UserProfile.objects.get(user=user)
    
    print("=" * 60)
    print("Testing Chart of Accounts API")
    print("=" * 60)
    print(f"User: {user.email}")
    print(f"Business ID: {profile.business_id}")
    print(f"Tenant ID: {user.tenant_id if hasattr(user, 'tenant_id') else profile.tenant_id}")
    print()
    
    # Check how many accounts exist for this business
    total_accounts = ChartOfAccount.objects.count()
    business_accounts = ChartOfAccount.objects.filter(business_id=profile.business_id).count()
    
    print(f"Total accounts in database: {total_accounts}")
    print(f"Accounts for this business: {business_accounts}")
    print()
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.get('/api/accounting/chart-of-accounts/')
    request.user = user
    request.tenant_id = user.tenant_id if hasattr(user, 'tenant_id') else profile.tenant_id
    
    # Call the view
    response = chart_of_accounts(request)
    
    if response.status_code == 200:
        import json
        data = json.loads(response.content)
        
        print(f"✅ API Response: SUCCESS")
        print(f"Number of accounts returned: {len(data)}")
        print()
        
        if data:
            print("First 5 accounts:")
            for i, account in enumerate(data[:5]):
                print(f"  {i+1}. {account['account_number']} - {account['name']}")
                print(f"     Category: {account.get('category_name', 'N/A')}")
                print(f"     Balance: ${account['balance']}")
        else:
            print("⚠️  No accounts returned (empty list)")
    else:
        print(f"❌ API Response: ERROR {response.status_code}")
        print(f"Response: {response.content.decode()}")
        
except User.DoesNotExist:
    print("❌ Error: support@dottapps.com user not found")
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

print()
print("=" * 60)
print("Database Check")
print("=" * 60)

# Show distribution of accounts by business
from django.db.models import Count
business_summary = ChartOfAccount.objects.values('business__name').annotate(count=Count('id'))
print("ChartOfAccount distribution by business:")
for item in business_summary:
    business_name = item['business__name'] or 'None'
    print(f"  {business_name}: {item['count']} accounts")
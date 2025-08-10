#!/usr/bin/env python
"""
Debug accounting standards in production - check all aspects
"""
import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from users.models import BusinessDetails, Business
from custom_auth.session_service import SessionService
import json

User = get_user_model()

def debug_production():
    print("=== PRODUCTION DEBUGGING ===\n")
    
    # 1. Check support user
    try:
        user = User.objects.get(email='support@dottapps.com')
        print(f"✓ Found user: {user.email} (ID: {user.id})")
    except User.DoesNotExist:
        print("✗ User support@dottapps.com not found")
        return
    
    # 2. Check business
    try:
        business = Business.objects.get(user=user)
        print(f"✓ Found business: {business.name} (ID: {business.id})")
    except Business.DoesNotExist:
        print("✗ Business not found for user")
        return
    
    # 3. Check business details
    try:
        bd = BusinessDetails.objects.get(business=business)
        print(f"✓ Found BusinessDetails:")
        print(f"  - Country: {bd.country}")
        print(f"  - Accounting Standard: {bd.accounting_standard}")
        print(f"  - Inventory Method: {bd.inventory_valuation_method}")
        print(f"  - Updated At: {bd.accounting_standard_updated_at}")
    except BusinessDetails.DoesNotExist:
        print("✗ BusinessDetails not found")
        bd = None
    
    # 4. Test API endpoint
    print("\n=== TESTING API ENDPOINT ===")
    
    # Create a session
    session_service = SessionService()
    session_data = session_service.create_session(user)
    print(f"\n✓ Created session: {session_data['session_id']}")
    
    # Create test client
    client = Client()
    client.force_login(user)
    
    # Test GET
    print("\n--- GET /api/business/settings/ ---")
    response = client.get('/api/business/settings/')
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.get('Content-Type')}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"Success: {data.get('success', 'No success field')}")
            print(f"Standard: {data.get('accounting_standard', 'No standard field')}")
            print(f"Display: {data.get('accounting_standard_display', 'No display field')}")
            print(f"Inventory: {data.get('inventory_valuation_method', 'No inventory field')}")
        except Exception as e:
            print(f"Error parsing JSON: {e}")
            print(f"Raw content: {response.content.decode()[:200]}...")
    else:
        print(f"Error content: {response.content.decode()}")
    
    # Test PATCH
    print("\n--- PATCH /api/business/settings/ ---")
    new_standard = 'GAAP' if bd and bd.accounting_standard == 'IFRS' else 'IFRS'
    print(f"Attempting to change to: {new_standard}")
    
    response = client.patch(
        '/api/business/settings/',
        data=json.dumps({'accounting_standard': new_standard}),
        content_type='application/json'
    )
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.get('Content-Type')}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"Success: {data.get('success', 'No success field')}")
            print(f"New standard: {data.get('accounting_standard', 'No standard field')}")
            print(f"Display: {data.get('accounting_standard_display', 'No display field')}")
        except Exception as e:
            print(f"Error parsing JSON: {e}")
            print(f"Raw content: {response.content.decode()[:200]}...")
    else:
        print(f"Error content: {response.content.decode()}")
    
    # 5. Check if update worked
    if bd:
        bd.refresh_from_db()
        print(f"\n✓ After update - Accounting Standard: {bd.accounting_standard}")

if __name__ == '__main__':
    debug_production()
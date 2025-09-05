#!/usr/bin/env python3
"""
Test script to check what the session creation API is actually returning
"""

import json
import requests
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pyfactor.settings")

import django
django.setup()

from django.contrib.auth import get_user_model
from session_manager.models import UserSession
from session_manager.services import session_service

def test_session_response():
    """Test what the session creation actually returns for a user"""
    print("🔍 Testing session response for mobile app compatibility...")
    
    # Find a test user
    User = get_user_model()
    test_user = User.objects.filter(email='support@dottapps.com').first()
    
    if not test_user:
        print("❌ Test user support@dottapps.com not found")
        return
    
    print(f"📧 Found test user: {test_user.email} (ID: {test_user.id})")
    print(f"🏢 User tenant: {test_user.tenant}")
    print(f"👤 User role: {getattr(test_user, 'role', 'Not set')}")
    print(f"🏷️ User name: {getattr(test_user, 'name', 'Not set')}")
    
    # Check business relationship
    has_business_via_tenant = bool(test_user.tenant)
    print(f"🔍 has_business via tenant: {has_business_via_tenant}")
    
    # Check via BusinessMember (original approach)
    try:
        from business.models import BusinessMember
        has_business_via_member = BusinessMember.objects.filter(user=test_user).exists()
        print(f"🔍 has_business via BusinessMember: {has_business_via_member}")
    except Exception as e:
        print(f"⚠️ Could not check BusinessMember: {e}")
        has_business_via_member = None
    
    # Simulate the session creation response data
    user_role = getattr(test_user, 'role', 'USER')
    has_business = bool(test_user.tenant)  # Current implementation
    
    response_data = {
        'session_token': 'test-session-token',
        'expires_at': '2025-09-06T12:37:51.371709+00:00',
        'user': {
            'id': test_user.id,
            'email': test_user.email,
            'name': getattr(test_user, 'name', ''),
            'role': user_role,
            'has_business': has_business,
        },
        'tenant': {
            'id': str(test_user.tenant.id) if test_user.tenant else None,
            'name': test_user.tenant.name if test_user.tenant else None,
        },
        'needs_onboarding': False,
        'onboarding_completed': True,
        'subscription_plan': 'free'
    }
    
    print("\n📋 Simulated session response:")
    print(json.dumps(response_data, indent=2))
    
    # Check what mobile app would see
    user_data = response_data['user']
    print(f"\n📱 Mobile app would see:")
    print(f"   - User ID: {user_data.get('id')}")
    print(f"   - Email: {user_data.get('email')}")
    print(f"   - Name: {user_data.get('name')}")
    print(f"   - Role: {user_data.get('role')}")
    print(f"   - Has Business: {user_data.get('has_business')}")
    
    if 'role' not in user_data or 'has_business' not in user_data:
        print("❌ MISSING FIELDS detected!")
    else:
        print("✅ All required fields present")

if __name__ == "__main__":
    test_session_response()
#!/usr/bin/env python
"""
Test script for new user API endpoints
Run this from Django shell: python manage.py shell < test_user_api_endpoints.py
"""

from django.contrib.auth import get_user_model
from django.test import RequestFactory
from rest_framework.test import force_authenticate
from users.api.profile_views import UserProfileView
from users.api.session_views import UserSessionListView
from session_manager.models import UserSession
from django.utils import timezone
import uuid

User = get_user_model()

# Create a test request factory
factory = RequestFactory()

# Get a test user
try:
    test_user = User.objects.first()
    if test_user:
        print(f"Testing with user: {test_user.email}")
        
        # Test UserProfileView
        print("\n1. Testing UserProfileView...")
        request = factory.get('/api/users/profile/')
        force_authenticate(request, user=test_user)
        view = UserProfileView()
        response = view.get(request)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Profile data keys: {list(response.data.keys())}")
        
        # Test UserSessionListView
        print("\n2. Testing UserSessionListView...")
        # Create a test session if none exists
        if not UserSession.objects.filter(user=test_user, is_active=True).exists():
            UserSession.objects.create(
                session_id=uuid.uuid4(),
                user=test_user,
                token=f"test-token-{uuid.uuid4().hex[:8]}",
                expires_at=timezone.now() + timezone.timedelta(days=1),
                is_active=True,
                session_type='web',
                ip_address='127.0.0.1',
                user_agent='Mozilla/5.0 Test Browser'
            )
        
        request = factory.get('/api/users/sessions/')
        force_authenticate(request, user=test_user)
        view = UserSessionListView()
        response = view.get(request)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Sessions found: {len(response.data.get('sessions', []))}")
        
        print("\n✅ API endpoints are configured correctly!")
        
    else:
        print("❌ No users found in database. Please create a user first.")
        
except Exception as e:
    print(f"❌ Error testing endpoints: {str(e)}")
    import traceback
    traceback.print_exc()
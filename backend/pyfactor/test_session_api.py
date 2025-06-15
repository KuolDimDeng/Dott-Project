#!/usr/bin/env python
"""Test session API with proper DRF request"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from session_manager.views import SessionCreateView
from custom_auth.models import User

# Get a test user
try:
    user = User.objects.first()
    print(f"Test user: {user.email}")
except:
    print("No users found!")
    sys.exit(1)

# Create an API request factory (DRF)
factory = APIRequestFactory()

# Create a mock POST request with proper DRF handling
request = factory.post(
    '/api/sessions/create/',
    data={
        'needs_onboarding': True,
        'subscription_plan': 'free'
    },
    format='json'
)

# Add user and auth to request (simulating Auth0JWTAuthentication)
request.user = user
request.auth = 'test_token_12345'

print("\nTesting SessionCreateView with DRF request...")
print(f"Request user: {request.user}")
print(f"Request auth: {request.auth}")

# Create view instance and call it properly
view = SessionCreateView.as_view()

try:
    # Call the view
    response = view(request)
    print(f"\nResponse status: {response.status_code}")
    print(f"Response data: {response.data}")
except Exception as e:
    print(f"\nError: {e}")
    import traceback
    traceback.print_exc()
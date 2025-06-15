#!/usr/bin/env python
"""Test session endpoint to debug the 500 error"""
import os
import sys
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from session_manager.views import SessionCreateView
from custom_auth.models import User

# Get a test user
try:
    user = User.objects.first()
    print(f"Test user: {user.email}")
except:
    print("No users found!")
    sys.exit(1)

# Create a request factory
factory = RequestFactory()

# Create a mock POST request
request = factory.post(
    '/api/sessions/create/',
    data=json.dumps({
        'needs_onboarding': True,
        'subscription_plan': 'free'
    }),
    content_type='application/json'
)

# Add auth headers
request.META['HTTP_AUTHORIZATION'] = 'Bearer test_token_12345'

# Add user and auth to request (simulating Auth0JWTAuthentication)
request.user = user
request.auth = 'test_token_12345'

print("\nTesting SessionCreateView directly...")
print(f"Request user: {request.user}")
print(f"Request auth: {request.auth}")
print(f"Request data: {request.body}")

# Create view instance
view = SessionCreateView()
view.request = request

try:
    # Call the view
    response = view.post(request)
    print(f"\nResponse status: {response.status_code}")
    print(f"Response data: {response.data}")
except Exception as e:
    print(f"\nError: {e}")
    import traceback
    traceback.print_exc()
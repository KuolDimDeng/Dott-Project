#!/usr/bin/env python3
import os
import django
os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings'
django.setup()

# Test the full request flow
from django.test import Client
from session_manager.models import UserSession
from django.contrib.auth import get_user_model

User = get_user_model()

# Get a valid session
session = UserSession.objects.filter(
    user__email='support@dottapps.com',
    is_active=True
).order_by('-created_at').first()

if session:
    print(f'Using session: {session.session_id}')
    
    # Create test client
    client = Client()
    
    # Make request with session header
    response = client.get(
        '/api/crm/customers/',
        HTTP_AUTHORIZATION=f'Session {session.session_id}'
    )
    
    print(f'Response status: {response.status_code}')
    if response.status_code != 200:
        print(f'Response content: {response.content[:1000].decode()}')
        
        # Try to get more details
        import json
        try:
            error_data = json.loads(response.content)
            print(f'Error details: {error_data}')
        except:
            pass
    else:
        print('Success! Customers endpoint is working')
        data = response.json()
        print(f'Response has {len(data.get("results", []))} customers')
else:
    print('No active session found')
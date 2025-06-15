#!/usr/bin/env python
import os
import sys
import django
import requests

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant

print("Testing session creation API...")

# Check for existing users
users = User.objects.all()
print(f"\nFound {users.count()} users in database")
for user in users[:5]:  # Show first 5 users
    print(f"  - User: {user.email}, ID: {user.id}, Auth0: {getattr(user, 'auth0_sub', 'NO AUTH0')}")

# Check for existing tenants
tenants = Tenant.objects.all()
print(f"\nFound {tenants.count()} tenants in database")
for tenant in tenants[:5]:  # Show first 5 tenants
    print(f"  - Tenant: {tenant.name}, ID: {tenant.id}")

# Check user-tenant relationships
print("\nUser-Tenant relationships:")
for user in users[:5]:
    user_tenant = getattr(user, 'tenant', None)
    print(f"  - User {user.email}: Tenant = {user_tenant}")

# Test session creation directly
print("\nTesting direct session creation...")
from session_manager.services import session_service

if users.exists():
    test_user = users.first()
    print(f"\nUsing test user: {test_user.email}")
    
    try:
        # Create a test session
        session = session_service.create_session(
            user=test_user,
            access_token="test_token_12345",
            request_meta={
                'ip_address': '127.0.0.1',
                'user_agent': 'Test Script'
            },
            needs_onboarding=True,
            subscription_plan='free'
        )
        print(f"✅ Session created successfully: {session.session_id}")
    except Exception as e:
        print(f"❌ Session creation failed: {e}")
        import traceback
        traceback.print_exc()
else:
    print("No users found in database!")

# Check database tables
print("\n\nChecking database tables...")
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%session%'
        ORDER BY table_name;
    """)
    tables = cursor.fetchall()
    print("Session-related tables:")
    for table in tables:
        print(f"  - {table[0]}")
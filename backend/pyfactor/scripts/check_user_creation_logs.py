#!/usr/bin/env python3
"""
Script to check user creation logs from the backend
Run this on the production server to see DirectUserCreation logs
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import connection

User = get_user_model()

def check_recent_user_creations():
    """Check recently created users"""
    print("\n=== Recently Created Users (Last 24 hours) ===")
    
    # Get users created in the last 24 hours
    since = datetime.now() - timedelta(hours=24)
    recent_users = User.objects.filter(
        date_joined__gte=since
    ).order_by('-date_joined')
    
    if not recent_users.exists():
        print("No users created in the last 24 hours")
        return
    
    for user in recent_users:
        print(f"\nUser: {user.email}")
        print(f"  ID: {user.id}")
        print(f"  Created: {user.date_joined}")
        print(f"  Auth0 Sub: {getattr(user, 'auth0_sub', 'Not set')}")
        print(f"  Role: {getattr(user, 'role', 'Not set')}")
        print(f"  Tenant: {getattr(user, 'tenant', 'Not set')}")
        print(f"  Active: {user.is_active}")
        print(f"  Email Verified: {getattr(user, 'email_verified', False)}")
        
        # Check if user has temporary auth0_sub (indicating Auth0 creation might have failed)
        if hasattr(user, 'auth0_sub') and user.auth0_sub and user.auth0_sub.startswith('pending_'):
            print(f"  ⚠️  WARNING: User has temporary Auth0 ID - Auth0 creation may have failed!")

def check_auth0_config():
    """Check if Auth0 configuration is properly set"""
    print("\n=== Auth0 Configuration Check ===")
    
    from django.conf import settings
    
    configs = [
        ('AUTH0_DOMAIN', getattr(settings, 'AUTH0_DOMAIN', None)),
        ('AUTH0_CLIENT_ID', getattr(settings, 'AUTH0_CLIENT_ID', None)),
        ('AUTH0_MANAGEMENT_CLIENT_ID', getattr(settings, 'AUTH0_MANAGEMENT_CLIENT_ID', None)),
        ('AUTH0_MANAGEMENT_CLIENT_SECRET', getattr(settings, 'AUTH0_MANAGEMENT_CLIENT_SECRET', None)),
    ]
    
    all_set = True
    for name, value in configs:
        if value:
            print(f"✓ {name}: {'*' * 10} (configured)")
        else:
            print(f"✗ {name}: NOT SET")
            all_set = False
    
    if not all_set:
        print("\n⚠️  WARNING: Some Auth0 configurations are missing!")
        print("This will prevent Auth0 user creation and password reset emails.")

def simulate_auth0_token_request():
    """Test Auth0 Management API token request"""
    print("\n=== Testing Auth0 Management API Connection ===")
    
    try:
        import requests
        from django.conf import settings
        
        # Check if credentials exist
        if not all([
            getattr(settings, 'AUTH0_MANAGEMENT_CLIENT_ID', None),
            getattr(settings, 'AUTH0_MANAGEMENT_CLIENT_SECRET', None)
        ]):
            print("✗ Auth0 M2M credentials not configured - cannot test connection")
            return
        
        # Use the actual Auth0 tenant domain
        auth0_tenant_domain = 'dev-cbyy63jovi6zrcos.us.auth0.com'
        
        token_url = f"https://{auth0_tenant_domain}/oauth/token"
        token_payload = {
            'client_id': settings.AUTH0_MANAGEMENT_CLIENT_ID,
            'client_secret': settings.AUTH0_MANAGEMENT_CLIENT_SECRET,
            'audience': f"https://{auth0_tenant_domain}/api/v2/",
            'grant_type': 'client_credentials'
        }
        
        print(f"Requesting token from: {token_url}")
        response = requests.post(token_url, json=token_payload)
        
        if response.status_code == 200:
            print("✓ Successfully obtained Auth0 Management API token")
            token_data = response.json()
            print(f"  Token type: {token_data.get('token_type')}")
            print(f"  Expires in: {token_data.get('expires_in')} seconds")
            print(f"  Scope: {token_data.get('scope', 'Not specified')}")
        else:
            print(f"✗ Failed to get Auth0 token: Status {response.status_code}")
            print(f"  Error: {response.text}")
            
    except Exception as e:
        print(f"✗ Error testing Auth0 connection: {str(e)}")

def check_email_configuration():
    """Check email configuration"""
    print("\n=== Email Configuration Check ===")
    
    from django.conf import settings
    
    email_backend = getattr(settings, 'EMAIL_BACKEND', 'Not configured')
    print(f"Email Backend: {email_backend}")
    
    if 'smtp' in email_backend.lower():
        configs = [
            ('EMAIL_HOST', getattr(settings, 'EMAIL_HOST', None)),
            ('EMAIL_PORT', getattr(settings, 'EMAIL_PORT', None)),
            ('EMAIL_HOST_USER', getattr(settings, 'EMAIL_HOST_USER', None)),
            ('EMAIL_USE_TLS', getattr(settings, 'EMAIL_USE_TLS', None)),
            ('DEFAULT_FROM_EMAIL', getattr(settings, 'DEFAULT_FROM_EMAIL', None)),
        ]
        
        for name, value in configs:
            if value:
                print(f"  {name}: {value if 'PASSWORD' not in name else '***'}")
            else:
                print(f"  {name}: NOT SET")

def main():
    """Main function"""
    print("=" * 60)
    print("User Creation Diagnostic Report")
    print("=" * 60)
    
    check_recent_user_creations()
    check_auth0_config()
    simulate_auth0_token_request()
    check_email_configuration()
    
    print("\n" + "=" * 60)
    print("To see live logs, check:")
    print("  - Application logs in your deployment platform")
    print("  - Backend server stdout/stderr")
    print("  - Django logs if configured")
    print("=" * 60)

if __name__ == "__main__":
    main()
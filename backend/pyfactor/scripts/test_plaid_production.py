#!/usr/bin/env python
"""
Test Plaid connection with production credentials
"""
import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode

def test_plaid_connection():
    print("Testing Plaid Production Connection...")
    print("=" * 50)
    
    # Check environment variables
    print(f"PLAID_ENV: {os.environ.get('PLAID_ENV', 'Not set')}")
    print(f"PLAID_CLIENT_ID: {os.environ.get('PLAID_CLIENT_ID', 'Not set')[:10]}..." if os.environ.get('PLAID_CLIENT_ID') else "PLAID_CLIENT_ID: Not set")
    print(f"PLAID_SECRET: {os.environ.get('PLAID_SECRET', 'Not set')[:10]}..." if os.environ.get('PLAID_SECRET') else "PLAID_SECRET: Not set")
    print()
    
    # Check Django settings
    print("Django Settings:")
    print(f"settings.PLAID_ENV: {getattr(settings, 'PLAID_ENV', 'Not set')}")
    print(f"settings.PLAID_CLIENT_ID: {getattr(settings, 'PLAID_CLIENT_ID', 'Not set')[:10]}..." if getattr(settings, 'PLAID_CLIENT_ID', None) else "settings.PLAID_CLIENT_ID: Not set")
    print(f"settings.PLAID_SECRET: {getattr(settings, 'PLAID_SECRET', 'Not set')[:10]}..." if getattr(settings, 'PLAID_SECRET', None) else "settings.PLAID_SECRET: Not set")
    print(f"settings.PLAID_CLIENT_NAME: {getattr(settings, 'PLAID_CLIENT_NAME', 'Not set')}")
    print()
    
    # Try to initialize Plaid
    try:
        print("Initializing Plaid client...")
        
        if not settings.PLAID_CLIENT_ID or not settings.PLAID_SECRET:
            print("ERROR: Plaid credentials not found in settings!")
            return
        
        # Determine environment
        if settings.PLAID_ENV == 'sandbox':
            host = plaid.Environment.Sandbox
            print("Using Sandbox environment")
        elif settings.PLAID_ENV == 'development':
            host = plaid.Environment.Development
            print("Using Development environment")
        elif settings.PLAID_ENV == 'production':
            host = plaid.Environment.Production
            print("Using Production environment")
        else:
            print(f"ERROR: Unknown PLAID_ENV: {settings.PLAID_ENV}")
            return
        
        configuration = plaid.Configuration(
            host=host,
            api_key={
                'clientId': settings.PLAID_CLIENT_ID,
                'secret': settings.PLAID_SECRET,
            }
        )
        
        client = plaid_api.PlaidApi(plaid.ApiClient(configuration))
        print("✓ Plaid client initialized successfully")
        print()
        
        # Try to create a link token
        print("Testing link token creation...")
        request = LinkTokenCreateRequest(
            products=[Products('transactions')],
            client_name=getattr(settings, 'PLAID_CLIENT_NAME', 'Dott'),
            country_codes=[CountryCode('US')],
            language='en',
            user=LinkTokenCreateRequestUser(
                client_user_id='test_user_123'
            )
        )
        
        response = client.link_token_create(request)
        print("✓ Link token created successfully!")
        print(f"Link token: {response['link_token'][:20]}...")
        print(f"Expiration: {response['expiration']}")
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Set production credentials for testing
    if len(sys.argv) > 1 and sys.argv[1] == '--production':
        print("Using production credentials from command line...")
        os.environ['PLAID_ENV'] = 'production'
        os.environ['PLAID_CLIENT_ID'] = '66d4706be66ef5001a59bbd2'
        os.environ['PLAID_SECRET'] = '6e7e1d7f3f43642b123b70cd428b86'
    
    test_plaid_connection()
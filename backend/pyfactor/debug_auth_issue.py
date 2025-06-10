#!/usr/bin/env python
"""
Debug script to test Auth0 authentication directly
"""
import os
import sys
import django
import json

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.test import RequestFactory
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from custom_auth.api.views.close_account_view import CloseAccountView

def test_auth_flow():
    """Test the authentication flow for close account endpoint"""
    print("🔍 TESTING AUTH0 AUTHENTICATION FLOW")
    print("=" * 50)
    
    # Create a mock request
    factory = RequestFactory()
    
    # Create a POST request to close account endpoint
    request = factory.post('/api/users/close-account/', 
        data=json.dumps({
            'reason': 'Testing',
            'feedback': 'Debug test'
        }),
        content_type='application/json'
    )
    
    # Add a test token (you'll need to replace this with a real token)
    test_token = "YOUR_REAL_AUTH0_TOKEN_HERE"
    request.META['HTTP_AUTHORIZATION'] = f'Bearer {test_token}'
    
    print("1. Testing Auth0JWTAuthentication directly")
    print("-" * 30)
    
    auth = Auth0JWTAuthentication()
    
    try:
        # Try to authenticate
        auth_result = auth.authenticate(request)
        
        if auth_result:
            user, token = auth_result
            print(f"✅ Authentication successful!")
            print(f"   User: {user}")
            print(f"   Email: {user.email}")
            print(f"   ID: {user.id}")
            print(f"   Is authenticated: {user.is_authenticated}")
            print(f"   Token length: {len(token) if token else 0}")
            
            # Set the user on the request
            request.user = user
            request.auth = token
            
            print("\n2. Testing CloseAccountView permissions")
            print("-" * 30)
            
            view = CloseAccountView()
            
            # Check permissions
            for permission_class in view.permission_classes:
                permission = permission_class()
                has_permission = permission.has_permission(request, view)
                print(f"   {permission_class.__name__}: {has_permission}")
                
                if not has_permission:
                    print(f"   ❌ Permission denied by {permission_class.__name__}")
            
        else:
            print("❌ Authentication failed - no result returned")
            
    except Exception as e:
        print(f"❌ Authentication error: {str(e)}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
    
    print("\n3. Checking middleware configuration")
    print("-" * 30)
    
    from custom_auth.enhanced_rls_middleware import EnhancedRowLevelSecurityMiddleware
    
    middleware = EnhancedRowLevelSecurityMiddleware(lambda r: None)
    print(f"   Public paths: {middleware.public_paths[:5]}...")
    print(f"   Auth0 tenant endpoints: {middleware.auth0_tenant_endpoints}")
    print(f"   Is /api/users/close-account/ in auth0_tenant_endpoints: {'/api/users/close-account/' in middleware.auth0_tenant_endpoints}")

if __name__ == "__main__":
    test_auth_flow()
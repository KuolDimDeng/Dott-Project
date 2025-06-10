#!/usr/bin/env python
"""
Direct test of close account endpoint authentication
"""
import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from custom_auth.api.views.close_account_view import CloseAccountView
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from rest_framework.permissions import IsAuthenticated

User = get_user_model()

def test_close_account_auth():
    """Test close account authentication directly"""
    print("🔍 TESTING CLOSE ACCOUNT AUTHENTICATION")
    print("=" * 50)
    
    # Check if the view is properly configured
    view = CloseAccountView()
    print("\n1. View Configuration:")
    print(f"   Authentication classes: {view.authentication_classes}")
    print(f"   Permission classes: {view.permission_classes}")
    
    # Check if user exists
    try:
        user = User.objects.get(email="kdeng@dottapps.com")
        print(f"\n2. User found: {user.email}")
        print(f"   ID: {user.id}")
        print(f"   Is active: {user.is_active}")
        print(f"   Is deleted: {getattr(user, 'is_deleted', False)}")
        print(f"   Tenant: {user.tenant}")
        
        # Check URL patterns
        print("\n3. Checking URL patterns:")
        from django.urls import reverse, NoReverseMatch
        try:
            url = reverse('close-account')
            print(f"   ✅ URL found: {url}")
        except NoReverseMatch:
            print(f"   ❌ URL 'close-account' not found in patterns")
            
        # Check if the endpoint is in the middleware auth0_tenant_endpoints
        print("\n4. Checking middleware configuration:")
        from custom_auth.enhanced_rls_middleware import EnhancedRowLevelSecurityMiddleware
        middleware = EnhancedRowLevelSecurityMiddleware(lambda r: None)
        print(f"   Is /api/users/close-account/ in auth0_tenant_endpoints: {'/api/users/close-account/' in middleware.auth0_tenant_endpoints}")
        
        # Create a mock request
        factory = RequestFactory()
        request = factory.post('/api/users/close-account/', 
            data={'reason': 'Test', 'feedback': 'Test'},
            content_type='application/json'
        )
        
        # Set the user directly
        request.user = user
        request.auth = None
        
        print("\n5. Testing permission check:")
        for permission_class in view.permission_classes:
            permission = permission_class()
            has_perm = permission.has_permission(request, view)
            print(f"   {permission_class.__name__}: {has_perm}")
            
    except User.DoesNotExist:
        print("❌ User kdeng@dottapps.com not found!")

if __name__ == "__main__":
    test_close_account_auth()
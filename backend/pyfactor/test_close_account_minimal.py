#!/usr/bin/env python
"""
Minimal test script to diagnose close account 403 error
"""
import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.contrib.auth import get_user_model
from django.urls import reverse, resolve
from custom_auth.api.views.close_account_view import CloseAccountView
from custom_auth.enhanced_rls_middleware import EnhancedRowLevelSecurityMiddleware

User = get_user_model()

def test_close_account_setup():
    """Test close account endpoint configuration"""
    print("🔍 TESTING CLOSE ACCOUNT CONFIGURATION")
    print("=" * 60)
    
    # 1. Check URL resolution
    print("\n1. URL Resolution:")
    try:
        url = '/api/users/close-account/'
        resolved = resolve(url)
        print(f"   ✅ URL resolves to: {resolved.func}")
        print(f"   View class: {resolved.func.view_class}")
        print(f"   View name: {resolved.view_name}")
    except Exception as e:
        print(f"   ❌ URL resolution failed: {e}")
    
    # 2. Check view authentication
    print("\n2. View Authentication Configuration:")
    view = CloseAccountView()
    print(f"   Authentication classes: {view.authentication_classes}")
    print(f"   Permission classes: {view.permission_classes}")
    
    # 3. Check middleware configuration
    print("\n3. Middleware Configuration:")
    middleware = EnhancedRowLevelSecurityMiddleware(lambda r: None)
    
    # Check if path is in special endpoints
    path = '/api/users/close-account/'
    print(f"\n   Checking path: {path}")
    print(f"   Is public path: {any(path.startswith(p) for p in middleware.public_paths)}")
    print(f"   Is auth0 tenant endpoint: {path in middleware.auth0_tenant_endpoints}")
    print(f"   Is admin path: {path.startswith('/admin/')}")
    
    # 4. Check if middleware would block this path
    print("\n4. Middleware Path Analysis:")
    
    # Show relevant middleware paths
    print("\n   Public paths that might match:")
    for p in middleware.public_paths:
        if 'close' in p or 'account' in p or 'user' in p:
            print(f"      - {p}")
    
    print("\n   Auth0 tenant endpoints:")
    for endpoint in middleware.auth0_tenant_endpoints:
        print(f"      - {endpoint}")
    
    # 5. Check user
    print("\n5. User Check:")
    try:
        user = User.objects.get(email="kdeng@dottapps.com")
        print(f"   ✅ User found: {user.email}")
        print(f"   User ID: {user.id}")
        print(f"   Is active: {user.is_active}")
        print(f"   Is deleted: {getattr(user, 'is_deleted', False)}")
        print(f"   Auth0 sub: {getattr(user, 'auth0_sub', 'Not set')}")
        
        # Check tenant
        if hasattr(user, 'tenant'):
            print(f"   Tenant: {user.tenant}")
        else:
            print("   ❌ No tenant attribute")
            
    except User.DoesNotExist:
        print("   ❌ User not found")
    
    # 6. Settings check
    print("\n6. Auth0 Settings Check:")
    from django.conf import settings
    print(f"   AUTH0_DOMAIN: {'✅ Set' if getattr(settings, 'AUTH0_DOMAIN', None) else '❌ Not set'}")
    print(f"   AUTH0_AUDIENCE: {'✅ Set' if getattr(settings, 'AUTH0_AUDIENCE', None) else '❌ Not set'}")
    print(f"   AUTH0_CLIENT_ID: {'✅ Set' if getattr(settings, 'AUTH0_CLIENT_ID', None) else '❌ Not set'}")
    
    # 7. Check authentication backend
    print("\n7. Authentication Backend:")
    from custom_auth.auth0_authentication import Auth0JWTAuthentication
    auth = Auth0JWTAuthentication()
    print(f"   Auth0 domain: {auth.domain}")
    print(f"   Auth0 issuer: {auth.issuer_domain}")
    print(f"   Auth0 audience: {auth.audience}")
    
    print("\n" + "=" * 60)
    print("DIAGNOSIS SUMMARY:")
    print("The 403 error is likely happening because:")
    print("1. The frontend is not sending a valid Auth0 access token")
    print("2. The token doesn't have the right audience/scope")
    print("3. The middleware is intercepting the request before it reaches the view")
    print("\nTo fix this, ensure:")
    print("1. Frontend gets fresh Auth0 access token with correct audience")
    print("2. Token is properly passed in Authorization header")
    print("3. Middleware allows the request to pass through")

if __name__ == "__main__":
    test_close_account_setup()
#!/usr/bin/env python3
"""
Test script to verify the authentication chain is working correctly
"""

import os
import sys
import django

# Setup Django
os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings'
django.setup()

from django.test import RequestFactory
from session_manager.unified_middleware import UnifiedSessionMiddleware
from custom_auth.unified_middleware import UnifiedTenantMiddleware
from session_manager.models import UserSession
from django.contrib.auth import get_user_model

User = get_user_model()

def test_middleware_chain():
    """Test that middleware chain properly authenticates requests"""
    
    # Get a valid session
    session = UserSession.objects.filter(is_active=True).first()
    if not session:
        print("❌ No active sessions found in database")
        return False
    
    print(f"✅ Found active session: {session.session_id}")
    print(f"   User: {session.user.email}")
    print(f"   User ID: {session.user.id}")
    print(f"   Has business_id: {hasattr(session.user, 'business_id')}")
    print(f"   Has tenant_id: {hasattr(session.user, 'tenant_id')}")
    
    # Create a fake request
    factory = RequestFactory()
    request = factory.get('/api/inventory/products/')
    
    # Add the session cookie
    request.COOKIES = {'sid': str(session.session_id)}
    request.META = {
        'HTTP_AUTHORIZATION': f'Session {session.session_id}',
    }
    
    print("\n📋 Testing UnifiedSessionMiddleware...")
    
    # Process through UnifiedSessionMiddleware
    session_middleware = UnifiedSessionMiddleware(lambda r: None)
    result = session_middleware.process_request(request)
    
    if result is not None:
        print(f"❌ UnifiedSessionMiddleware returned error: {result}")
        return False
    
    if not hasattr(request, 'user'):
        print("❌ UnifiedSessionMiddleware did not set request.user")
        return False
    
    print(f"✅ UnifiedSessionMiddleware set request.user: {request.user}")
    print(f"   User authenticated: {request.user.is_authenticated}")
    print(f"   User has business_id: {hasattr(request.user, 'business_id')}")
    print(f"   User has tenant_id: {hasattr(request.user, 'tenant_id')}")
    
    if hasattr(request.user, 'business_id'):
        print(f"   business_id value: {request.user.business_id}")
    if hasattr(request.user, 'tenant_id'):
        print(f"   tenant_id value: {request.user.tenant_id}")
    
    print("\n📋 Testing UnifiedTenantMiddleware...")
    
    # Process through UnifiedTenantMiddleware
    tenant_middleware = UnifiedTenantMiddleware(lambda r: None)
    result = tenant_middleware.process_request(request)
    
    if result is not None:
        print(f"❌ UnifiedTenantMiddleware returned error: {result}")
        if hasattr(result, 'content'):
            print(f"   Error content: {result.content}")
        return False
    
    if not hasattr(request, 'tenant_id'):
        print("❌ UnifiedTenantMiddleware did not set request.tenant_id")
        return False
    
    print(f"✅ UnifiedTenantMiddleware set request.tenant_id: {request.tenant_id}")
    
    print("\n✅ ✅ ✅ Authentication chain is working correctly! ✅ ✅ ✅")
    return True

if __name__ == '__main__':
    try:
        success = test_middleware_chain()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
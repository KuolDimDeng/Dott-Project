#!/usr/bin/env python3
"""
Debug script to test middleware tenant extraction.
This will help identify why the middleware isn't setting tenant context from user business_id.
"""

import os
import sys
import django

# Add the project root to Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

from django.test import RequestFactory
from custom_auth.models import User
from custom_auth.enhanced_rls_middleware import EnhancedRowLevelSecurityMiddleware
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def debug_middleware_tenant_extraction():
    """Debug the middleware's tenant extraction logic"""
    
    logger.info("🔍 === MIDDLEWARE TENANT EXTRACTION DEBUG ===")
    
    # Step 1: Find test user
    try:
        test_user = User.objects.filter(business_id__isnull=False).first()
        if not test_user:
            logger.error("❌ No test user found")
            return False
            
        logger.info(f"✅ Found test user: {test_user.email}")
        logger.info(f"✅ User business_id: {test_user.business_id}")
        logger.info(f"✅ User business_id type: {type(test_user.business_id)}")
        
        # Check user attributes that middleware looks for
        logger.info(f"🔍 hasattr(user, 'business_id'): {hasattr(test_user, 'business_id')}")
        logger.info(f"🔍 user.business_id is not None: {test_user.business_id is not None}")
        logger.info(f"🔍 hasattr(user, 'tenant_id'): {hasattr(test_user, 'tenant_id')}")
        logger.info(f"🔍 hasattr(user, 'tenant'): {hasattr(test_user, 'tenant')}")
        
    except Exception as e:
        logger.error(f"❌ Error finding test user: {e}")
        return False
    
    # Step 2: Create request factory
    factory = RequestFactory()
    
    # Step 3: Test different request scenarios
    scenarios = [
        {
            'name': 'Request with X-Tenant-ID header',
            'path': '/api/inventory/materials/',
            'headers': {'HTTP_X_TENANT_ID': str(test_user.business_id)},
            'user': test_user
        },
        {
            'name': 'Request with user but no header',
            'path': '/api/inventory/materials/',
            'headers': {},
            'user': test_user
        },
        {
            'name': 'Request with both header and user',
            'path': '/api/inventory/materials/',
            'headers': {'HTTP_X_TENANT_ID': str(test_user.business_id)},
            'user': test_user
        }
    ]
    
    # Step 4: Test middleware with each scenario
    class MockGetResponse:
        def __call__(self, request):
            return f"Mock response for {request.path}"
    
    middleware = EnhancedRowLevelSecurityMiddleware(MockGetResponse())
    
    for scenario in scenarios:
        logger.info(f"\n🧪 Testing scenario: {scenario['name']}")
        
        try:
            # Create request
            request = factory.get(scenario['path'], **scenario['headers'])
            request.user = scenario['user']
            
            logger.info(f"🧪 Request path: {request.path}")
            logger.info(f"🧪 Request headers: {dict(request.META)}")
            logger.info(f"🧪 Request user: {request.user.email if request.user else 'None'}")
            
            # Test middleware's _get_tenant_id method
            tenant_id = middleware._get_tenant_id(request)
            logger.info(f"🧪 Extracted tenant_id: {tenant_id}")
            logger.info(f"🧪 Tenant_id type: {type(tenant_id)}")
            
            # Test middleware's _requires_tenant method
            requires_tenant = middleware._requires_tenant(request.path)
            logger.info(f"🧪 Requires tenant: {requires_tenant}")
            
            # Test individual extraction methods
            tenant_from_headers = middleware._get_tenant_from_headers(request)
            logger.info(f"🧪 Tenant from headers: {tenant_from_headers}")
            
            tenant_from_user = middleware._get_tenant_from_user(request.user)
            logger.info(f"🧪 Tenant from user: {tenant_from_user}")
            
        except Exception as e:
            logger.error(f"❌ Error in scenario '{scenario['name']}': {e}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
    
    logger.info("\n🔍 === MIDDLEWARE DEBUG COMPLETE ===")
    return True

if __name__ == '__main__':
    print("🚀 Starting Middleware Tenant Extraction Debug")
    debug_middleware_tenant_extraction()
    print("✅ Debug completed")
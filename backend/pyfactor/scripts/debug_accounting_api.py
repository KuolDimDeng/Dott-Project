#!/usr/bin/env python
"""
Debug the accounting standards API by checking all components
"""
import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.urls import get_resolver, reverse
from django.contrib.auth import get_user_model
from users.models import BusinessDetails
from pyfactor.urls import urlpatterns

User = get_user_model()

def debug_urls():
    print("=== URL DEBUGGING ===\n")
    
    # Check if the URL pattern exists
    print("Looking for business_settings URL pattern...")
    
    # Get the resolver
    resolver = get_resolver()
    
    # Try to find the URL
    try:
        match = reverse('business_settings')
        print(f"✓ Found 'business_settings' URL: {match}")
    except Exception as e:
        print(f"✗ Could not reverse 'business_settings': {e}")
    
    # List all URL patterns that contain 'business'
    print("\nAll URLs containing 'business':")
    
    def list_urls(urlpatterns, prefix=''):
        for pattern in urlpatterns:
            if hasattr(pattern, 'url_patterns'):
                # This is an included URLconf
                list_urls(pattern.url_patterns, prefix + str(pattern.pattern))
            else:
                # This is a URLPattern
                if 'business' in str(pattern.pattern):
                    print(f"  {prefix}{pattern.pattern} -> {pattern.callback}")
    
    # Import the main urls
    from pyfactor import urls as main_urls
    list_urls(main_urls.urlpatterns)
    
    # Also check users app URLs directly
    print("\nChecking users app URLs:")
    from users import urls as users_urls
    for pattern in users_urls.urlpatterns:
        if 'business' in str(pattern.pattern):
            print(f"  {pattern.pattern} -> {pattern.name if hasattr(pattern, 'name') else 'no name'}")

def check_business_details():
    print("\n=== BUSINESS DETAILS CHECK ===\n")
    
    # Check support user
    try:
        user = User.objects.get(email='support@dottapps.com')
        print(f"✓ Found user: {user.email}")
        
        # Check BusinessDetails
        from business.models import Business
        business = Business.objects.get(user=user)
        print(f"✓ Found business: {business.name}")
        
        bd = BusinessDetails.objects.get(business=business)
        print(f"✓ Found BusinessDetails:")
        print(f"  - Business: {bd.business.name}")
        print(f"  - Country: {bd.country}")
        print(f"  - Accounting Standard: {bd.accounting_standard}")
        print(f"  - Inventory Method: {bd.inventory_valuation_method}")
        
        # Check if fields have default values
        if not bd.accounting_standard:
            print("  ⚠️  Accounting standard is None/empty!")
        if not bd.inventory_valuation_method:
            print("  ⚠️  Inventory method is None/empty!")
            
    except User.DoesNotExist:
        print("✗ User support@dottapps.com not found")
    except BusinessDetails.DoesNotExist:
        print("✗ BusinessDetails not found for support@dottapps.com")

def test_view_directly():
    print("\n=== TESTING VIEW DIRECTLY ===\n")
    
    try:
        from users.api.business_settings_views import BusinessSettingsView
        from django.test import RequestFactory
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        user = User.objects.get(email='support@dottapps.com')
        
        # Create a request
        factory = RequestFactory()
        request = factory.get('/api/business/settings/')
        request.user = user
        
        # Call the view
        view = BusinessSettingsView.as_view()
        response = view(request)
        
        print(f"Direct view call status: {response.status_code}")
        if hasattr(response, 'data'):
            print(f"Response data: {response.data}")
        
    except Exception as e:
        print(f"Error testing view directly: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    debug_urls()
    check_business_details()
    test_view_directly()
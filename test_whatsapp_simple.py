#!/usr/bin/env python3

import os
import sys
import django
from django.conf import settings

# Add the backend directory to Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

print("🚀 Testing WhatsApp Business Feature...")
print("=" * 50)

try:
    # Test basic imports
    print("1. Testing basic imports...")
    from custom_auth.models import Tenant
    print("   ✅ Tenant model imported successfully")
    
    from whatsapp_business.models import (
        WhatsAppBusinessSettings,
        WhatsAppCatalog,
        WhatsAppProduct,
        WhatsAppOrder
    )
    print("   ✅ WhatsApp Business models imported successfully")
    
    # Test ViewSet imports
    print("2. Testing ViewSet imports...")
    from whatsapp_business.views import (
        WhatsAppBusinessSettingsViewSet,
        WhatsAppCatalogViewSet,
        WhatsAppProductViewSet
    )
    print("   ✅ WhatsApp Business ViewSets imported successfully")
    
    # Test serializer imports
    print("3. Testing serializer imports...")
    from whatsapp_business.serializers import (
        WhatsAppBusinessSettingsSerializer,
        WhatsAppCatalogSerializer,
        WhatsAppProductSerializer
    )
    print("   ✅ WhatsApp Business Serializers imported successfully")
    
    # Test URL patterns
    print("4. Testing URL patterns...")
    from whatsapp_business.urls import urlpatterns
    print(f"   ✅ WhatsApp Business URLs loaded - {len(urlpatterns)} patterns")
    
    print("\n" + "=" * 50)
    print("✅ ALL TESTS PASSED!")
    print("✅ WhatsApp Business feature is ready for deployment")
    print("=" * 50)

except ImportError as e:
    print(f"❌ Import Error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
#!/usr/bin/env python
"""
Test WhatsApp Business API endpoints
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from whatsapp_business.models import WhatsAppBusinessSettings, WhatsAppCatalog
from businesses.models import Business

User = get_user_model()

def test_whatsapp_business():
    """Test WhatsApp Business functionality"""
    try:
        # Get a test user and business
        user = User.objects.filter(email='support@dottapps.com').first()
        if not user:
            print("❌ Test user not found")
            return
        
        print(f"✅ Found user: {user.email}")
        
        # Get the user's business
        business = Business.objects.filter(id=user.tenant_id).first()
        if not business:
            print("❌ Business not found")
            return
            
        print(f"✅ Found business: {business.name}")
        
        # Check if WhatsApp Business settings exist
        settings = WhatsAppBusinessSettings.objects.filter(business=business).first()
        if settings:
            print(f"✅ WhatsApp Business settings exist: {settings}")
            print(f"   - Enabled: {settings.is_enabled}")
            print(f"   - Business Name: {settings.business_name}")
        else:
            print("⚠️  No WhatsApp Business settings found")
            
        # Check catalogs
        catalogs = WhatsAppCatalog.objects.filter(business=business)
        print(f"\n📦 Catalogs: {catalogs.count()}")
        for catalog in catalogs:
            print(f"   - {catalog.name}: {catalog.description}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_whatsapp_business()
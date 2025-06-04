#!/usr/bin/env python

import os
import sys
import django
import requests

# Setup Django
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def test_enhanced_lookup():
    """Test the enhanced user lookup by making a request to the actual API"""
    
    print("🔍 Testing Enhanced User Lookup")
    print("=" * 50)
    
    # Test with a simple API call to see if the enhanced logic is working
    url = "https://api.dottapps.com/health/"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"✅ API Health Check: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        # Check if we can see any tenant records
        from custom_auth.models import Tenant
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        print(f"\n🔍 Database Diagnostic:")
        print(f"Total users in database: {User.objects.count()}")
        print(f"Total tenants in database: {Tenant.objects.count()}")
        
        # Look for users with target email
        target_email = "jubacargovillage@gmail.com"
        users_with_email = User.objects.filter(email=target_email)
        print(f"Users with email {target_email}: {users_with_email.count()}")
        
        for user in users_with_email:
            print(f"  - User ID: {user.pk}, Email: {user.email}")
            tenant = Tenant.objects.filter(owner_id=user.pk).first()
            if tenant:
                print(f"    Tenant: {tenant.id}")
            else:
                print(f"    No tenant found")
        
        # Look for specific tenant ID
        target_tenant_id = "0e781e5d-139e-4036-9982-0469e8bcb9d2"
        try:
            target_tenant = Tenant.objects.get(id=target_tenant_id)
            print(f"\n✅ Target tenant found: {target_tenant.id}")
            print(f"   Owner ID: {target_tenant.owner_id}")
            print(f"   Name: {target_tenant.name}")
            
            # Get the owner user
            try:
                owner = User.objects.get(pk=target_tenant.owner_id)
                print(f"   Owner email: {owner.email}")
                print(f"   Owner Auth0 sub: {getattr(owner, 'auth0_sub', 'None')}")
            except User.DoesNotExist:
                print(f"   ❌ Owner user not found!")
                
        except Tenant.DoesNotExist:
            print(f"❌ Target tenant {target_tenant_id} not found!")
        
    except Exception as e:
        print(f"❌ Error during diagnostic: {str(e)}")

if __name__ == "__main__":
    test_enhanced_lookup() 
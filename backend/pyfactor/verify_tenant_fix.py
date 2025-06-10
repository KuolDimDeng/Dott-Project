#!/usr/bin/env python
"""
Verify the tenant lookup fix is working correctly
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant, OnboardingProgress
from django.db import connection

def verify_tenant_lookup():
    """Verify tenant lookup is working correctly"""
    
    print("🔍 Verifying Tenant Lookup Fix")
    print("=" * 50)
    
    # Find the user
    email = "kdeng@dottapps.com"
    try:
        user = User.objects.get(email=email)
        print(f"✅ Found user: {user.email} (ID: {user.id}, Type: {type(user.id)})")
        
        # Check if user has tenant via foreign key
        if hasattr(user, 'tenant') and user.tenant:
            print(f"✅ User has tenant via FK: {user.tenant.id}")
        else:
            print("❌ User has NO tenant via foreign key")
        
        # Try to find tenant by owner_id (original query)
        tenant_original = Tenant.objects.filter(owner_id=user.id).first()
        if tenant_original:
            print(f"✅ Found tenant with owner_id={user.id}: {tenant_original.id}")
        else:
            print(f"❌ NO tenant found with owner_id={user.id}")
        
        # Try to find tenant by owner_id with string conversion (fixed query)
        tenant_fixed = Tenant.objects.filter(owner_id=str(user.id)).first()
        if tenant_fixed:
            print(f"✅ Found tenant with owner_id=str({user.id}): {tenant_fixed.id}")
        else:
            print(f"❌ NO tenant found with owner_id=str({user.id})")
        
        # Check what's actually in the database
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, owner_id, name 
                FROM tenant 
                WHERE owner_id = %s OR owner_id = %s
                LIMIT 5
            """, [user.id, str(user.id)])
            
            results = cursor.fetchall()
            if results:
                print("\n📊 Database query results:")
                for row in results:
                    print(f"   Tenant ID: {row[0]}, owner_id: '{row[1]}' (type in DB: {type(row[1])}), name: {row[2]}")
            else:
                print("\n❌ No tenants found in direct database query")
                
                # Check all tenants to see format
                cursor.execute("""
                    SELECT DISTINCT owner_id, COUNT(*) 
                    FROM tenant 
                    GROUP BY owner_id 
                    ORDER BY owner_id 
                    LIMIT 10
                """)
                
                print("\n📊 Sample owner_id values in database:")
                for row in cursor.fetchall():
                    print(f"   owner_id: '{row[0]}' (count: {row[1]})")
        
        # Check onboarding progress
        progress = OnboardingProgress.objects.filter(user=user).first()
        if progress:
            print(f"\n📋 Onboarding Progress:")
            print(f"   - Status: {progress.onboarding_status}")
            print(f"   - Tenant ID in progress: {progress.tenant_id}")
            print(f"   - Setup completed: {progress.setup_completed}")
        
    except User.DoesNotExist:
        print(f"❌ User {email} not found")
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    verify_tenant_lookup()
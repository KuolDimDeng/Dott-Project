#!/usr/bin/env python
"""
Fix the tenant relationship for support@dottapps.com
The has_business flag is computed from user.tenant
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from custom_auth.models import User, Tenant

def fix_user_tenant():
    email = 'support@dottapps.com'
    
    print("\n" + "="*60)
    print(f"Fixing tenant for {email}")
    print("="*60 + "\n")
    
    with transaction.atomic():
        try:
            # Get the user
            user = User.objects.get(email=email)
            
            print(f"Current status:")
            print(f"  - Email: {user.email}")
            print(f"  - Role: {user.role}")
            print(f"  - User ID: {user.id}")
            print(f"  - Current tenant: {user.tenant if hasattr(user, 'tenant') else 'NOT SET'}")
            print(f"  - Has tenant: {bool(user.tenant) if hasattr(user, 'tenant') else False}")
            
            # Check if tenant exists
            tenant = None
            try:
                tenant = user.tenant
                print(f"\n✓ User has tenant: {tenant.id}")
            except:
                print(f"\n✗ User has NO tenant relationship!")
                
                # Create or get tenant for this user
                print("\nCreating tenant...")
                tenant, created = Tenant.objects.get_or_create(
                    id=user.id,  # Tenant ID = User ID in this system
                    defaults={
                        'name': 'Dott support',
                        'owner': user
                    }
                )
                
                if created:
                    print(f"✓ Created new tenant with ID: {tenant.id}")
                else:
                    print(f"✓ Found existing tenant with ID: {tenant.id}")
                    # Update owner if needed
                    if tenant.owner != user:
                        tenant.owner = user
                        tenant.save()
                        print(f"✓ Updated tenant owner")
            
            # Verify the relationship
            user.refresh_from_db()
            has_tenant = bool(user.tenant) if hasattr(user, 'tenant') else False
            
            print(f"\n" + "="*60)
            print("VERIFICATION:")
            print("="*60)
            print(f"  - User has tenant: {has_tenant}")
            print(f"  - has_business will be: {has_tenant}")
            
            if has_tenant:
                print("\n✅ SUCCESS! The Business menu should now appear!")
                print("\nNext steps:")
                print("1. Log out of support@dottapps.com")
                print("2. Log back in")
                print("3. The Business menu should now be visible")
            else:
                print("\n❌ Still no tenant relationship. May need manual database fix.")
            
        except User.DoesNotExist:
            print(f"❌ User {email} not found!")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == '__main__':
    fix_user_tenant()
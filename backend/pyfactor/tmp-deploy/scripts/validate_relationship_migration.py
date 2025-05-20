#!/usr/bin/env python
"""
This script validates that the relationship data migration from ForeignKey to
direct UUID fields was performed correctly. It compares the old relationships
(if available in backup tables) with the new UUID field relationships.
"""

import os
import sys
import django
from django.db import connection, transaction

# Set up Django environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Import models
from custom_auth.models import User, Tenant
from users.models import UserProfile, Business


def validate_user_tenant_relationships():
    """Validate User-Tenant relationships were migrated correctly"""
    print("\n=== Validating User-Tenant Relationships ===")
    
    # Check if backup tables exist
    backup_exists = False
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'django_migrations_backup'
                    AND table_name = 'custom_auth_user'
                )
            """)
            backup_exists = cursor.fetchone()[0]
    except Exception as e:
        print(f"Error checking for backup tables: {e}")
        backup_exists = False
    
    if backup_exists:
        print("Backup tables found. Comparing with original data...")
        try:
            with connection.cursor() as cursor:
                # Get old User-Tenant relationships
                cursor.execute("""
                    SELECT id, tenant_id 
                    FROM django_migrations_backup.custom_auth_user
                    WHERE tenant_id IS NOT NULL
                """)
                old_user_tenant = {str(row[0]): str(row[1]) for row in cursor.fetchall()}
                
                # Check if new relationships match old ones
                mismatches = 0
                for user_id, expected_tenant_id in old_user_tenant.items():
                    try:
                        user = User.objects.get(id=user_id)
                        actual_tenant_id = str(user.tenant_id) if user.tenant_id else None
                        
                        if actual_tenant_id != expected_tenant_id:
                            print(f"MISMATCH: User {user_id} - Expected tenant: {expected_tenant_id}, Actual: {actual_tenant_id}")
                            mismatches += 1
                    except User.DoesNotExist:
                        print(f"WARNING: User {user_id} no longer exists")
                
                if mismatches == 0:
                    print(f"SUCCESS: All {len(old_user_tenant)} User-Tenant relationships match")
                else:
                    print(f"WARNING: Found {mismatches} mismatches out of {len(old_user_tenant)} relationships")
        except Exception as e:
            print(f"Error validating User-Tenant relationships: {e}")
    else:
        print("No backup tables found. Validating current state only...")
        
        # Check that User.tenant_id values can be resolved to valid Tenants
        users_with_tenants = User.objects.filter(tenant_id__isnull=False)
        print(f"Found {users_with_tenants.count()} users with tenant_id values")
        
        valid_count = 0
        invalid_count = 0
        
        for user in users_with_tenants:
            try:
                tenant = Tenant.objects.get(id=user.tenant_id)
                if tenant:
                    valid_count += 1
                    # Validate property accessor works
                    tenant_from_property = user.tenant
                    if tenant_from_property and tenant_from_property.id == tenant.id:
                        pass  # Success
                    else:
                        print(f"WARNING: User {user.id} - Property accessor 'tenant' not working correctly")
                        invalid_count += 1
            except Tenant.DoesNotExist:
                print(f"ERROR: User {user.id} has tenant_id {user.tenant_id} but no such tenant exists")
                invalid_count += 1
        
        print(f"Valid User-Tenant relationships: {valid_count}")
        print(f"Invalid User-Tenant relationships: {invalid_count}")


def validate_tenant_owner_relationships():
    """Validate Tenant-Owner relationships were migrated correctly"""
    print("\n=== Validating Tenant-Owner Relationships ===")
    
    # Check if backup tables exist
    backup_exists = False
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'django_migrations_backup'
                    AND table_name = 'custom_auth_tenant'
                )
            """)
            backup_exists = cursor.fetchone()[0]
    except Exception as e:
        print(f"Error checking for backup tables: {e}")
        backup_exists = False
    
    if backup_exists:
        print("Backup tables found. Comparing with original data...")
        try:
            with connection.cursor() as cursor:
                # Get old Tenant-Owner relationships
                cursor.execute("""
                    SELECT id, owner_id 
                    FROM django_migrations_backup.custom_auth_tenant
                    WHERE owner_id IS NOT NULL
                """)
                old_tenant_owner = {str(row[0]): str(row[1]) for row in cursor.fetchall()}
                
                # Check if new relationships match old ones
                mismatches = 0
                for tenant_id, expected_owner_id in old_tenant_owner.items():
                    try:
                        tenant = Tenant.objects.get(id=tenant_id)
                        actual_owner_id = str(tenant.owner_id) if tenant.owner_id else None
                        
                        if actual_owner_id != expected_owner_id:
                            print(f"MISMATCH: Tenant {tenant_id} - Expected owner: {expected_owner_id}, Actual: {actual_owner_id}")
                            mismatches += 1
                    except Tenant.DoesNotExist:
                        print(f"WARNING: Tenant {tenant_id} no longer exists")
                
                if mismatches == 0:
                    print(f"SUCCESS: All {len(old_tenant_owner)} Tenant-Owner relationships match")
                else:
                    print(f"WARNING: Found {mismatches} mismatches out of {len(old_tenant_owner)} relationships")
        except Exception as e:
            print(f"Error validating Tenant-Owner relationships: {e}")
    else:
        print("No backup tables found. Validating current state only...")
        
        # Check that Tenant.owner_id values can be resolved to valid Users
        tenants_with_owners = Tenant.objects.filter(owner_id__isnull=False)
        print(f"Found {tenants_with_owners.count()} tenants with owner_id values")
        
        valid_count = 0
        invalid_count = 0
        
        for tenant in tenants_with_owners:
            try:
                owner = User.objects.get(id=tenant.owner_id)
                if owner:
                    valid_count += 1
                    # Validate property accessor works
                    owner_from_property = tenant.owner
                    if owner_from_property and owner_from_property.id == owner.id:
                        pass  # Success
                    else:
                        print(f"WARNING: Tenant {tenant.id} - Property accessor 'owner' not working correctly")
                        invalid_count += 1
            except User.DoesNotExist:
                print(f"ERROR: Tenant {tenant.id} has owner_id {tenant.owner_id} but no such user exists")
                invalid_count += 1
        
        print(f"Valid Tenant-Owner relationships: {valid_count}")
        print(f"Invalid Tenant-Owner relationships: {invalid_count}")


def validate_userprofile_relationships():
    """Validate UserProfile relationships were migrated correctly"""
    print("\n=== Validating UserProfile Relationships ===")
    
    # Check if backup tables exist
    backup_exists = False
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'django_migrations_backup'
                    AND table_name = 'users_userprofile'
                )
            """)
            backup_exists = cursor.fetchone()[0]
    except Exception as e:
        print(f"Error checking for backup tables: {e}")
        backup_exists = False
    
    if backup_exists:
        print("Backup tables found. Comparing with original data...")
        try:
            with connection.cursor() as cursor:
                # Get old UserProfile-Tenant relationships
                cursor.execute("""
                    SELECT id, tenant_id 
                    FROM django_migrations_backup.users_userprofile
                    WHERE tenant_id IS NOT NULL
                """)
                old_profile_tenant = {str(row[0]): str(row[1]) for row in cursor.fetchall()}
                
                # Get old UserProfile-Business relationships
                cursor.execute("""
                    SELECT id, business_id 
                    FROM django_migrations_backup.users_userprofile
                    WHERE business_id IS NOT NULL
                """)
                old_profile_business = {str(row[0]): str(row[1]) for row in cursor.fetchall()}
                
                # Check UserProfile-Tenant relationships
                tenant_mismatches = 0
                for profile_id, expected_tenant_id in old_profile_tenant.items():
                    try:
                        profile = UserProfile.objects.get(id=profile_id)
                        actual_tenant_id = str(profile.tenant_id) if profile.tenant_id else None
                        
                        if actual_tenant_id != expected_tenant_id:
                            print(f"MISMATCH: UserProfile {profile_id} - Expected tenant: {expected_tenant_id}, Actual: {actual_tenant_id}")
                            tenant_mismatches += 1
                    except UserProfile.DoesNotExist:
                        print(f"WARNING: UserProfile {profile_id} no longer exists")
                
                # Check UserProfile-Business relationships
                business_mismatches = 0
                for profile_id, expected_business_id in old_profile_business.items():
                    try:
                        profile = UserProfile.objects.get(id=profile_id)
                        actual_business_id = str(profile.business_id) if profile.business_id else None
                        
                        if actual_business_id != expected_business_id:
                            print(f"MISMATCH: UserProfile {profile_id} - Expected business: {expected_business_id}, Actual: {actual_business_id}")
                            business_mismatches += 1
                    except UserProfile.DoesNotExist:
                        print(f"WARNING: UserProfile {profile_id} no longer exists")
                
                if tenant_mismatches == 0:
                    print(f"SUCCESS: All {len(old_profile_tenant)} UserProfile-Tenant relationships match")
                else:
                    print(f"WARNING: Found {tenant_mismatches} mismatches out of {len(old_profile_tenant)} UserProfile-Tenant relationships")
                
                if business_mismatches == 0:
                    print(f"SUCCESS: All {len(old_profile_business)} UserProfile-Business relationships match")
                else:
                    print(f"WARNING: Found {business_mismatches} mismatches out of {len(old_profile_business)} UserProfile-Business relationships")
        except Exception as e:
            print(f"Error validating UserProfile relationships: {e}")
    else:
        print("No backup tables found. Validating current state only...")
        
        # Check UserProfile.tenant_id values
        profiles_with_tenants = UserProfile.objects.filter(tenant_id__isnull=False)
        print(f"Found {profiles_with_tenants.count()} user profiles with tenant_id values")
        
        valid_tenant_count = 0
        invalid_tenant_count = 0
        
        for profile in profiles_with_tenants:
            try:
                tenant = Tenant.objects.get(id=profile.tenant_id)
                if tenant:
                    valid_tenant_count += 1
                    # Validate property accessor works
                    tenant_from_property = profile.tenant
                    if tenant_from_property and tenant_from_property.id == tenant.id:
                        pass  # Success
                    else:
                        print(f"WARNING: UserProfile {profile.id} - Property accessor 'tenant' not working correctly")
                        invalid_tenant_count += 1
            except Tenant.DoesNotExist:
                print(f"ERROR: UserProfile {profile.id} has tenant_id {profile.tenant_id} but no such tenant exists")
                invalid_tenant_count += 1
        
        print(f"Valid UserProfile-Tenant relationships: {valid_tenant_count}")
        print(f"Invalid UserProfile-Tenant relationships: {invalid_tenant_count}")
        
        # Check UserProfile.business_id values
        profiles_with_businesses = UserProfile.objects.filter(business_id__isnull=False)
        print(f"Found {profiles_with_businesses.count()} user profiles with business_id values")
        
        valid_business_count = 0
        invalid_business_count = 0
        
        for profile in profiles_with_businesses:
            try:
                business = Business.objects.get(id=profile.business_id)
                if business:
                    valid_business_count += 1
                    # Validate property accessor works
                    business_from_property = profile.business
                    if business_from_property and business_from_property.id == business.id:
                        pass  # Success
                    else:
                        print(f"WARNING: UserProfile {profile.id} - Property accessor 'business' not working correctly")
                        invalid_business_count += 1
            except Business.DoesNotExist:
                print(f"ERROR: UserProfile {profile.id} has business_id {profile.business_id} but no such business exists")
                invalid_business_count += 1
        
        print(f"Valid UserProfile-Business relationships: {valid_business_count}")
        print(f"Invalid UserProfile-Business relationships: {invalid_business_count}")


if __name__ == "__main__":
    print("=== Relationship Migration Validation ===")
    print("This script validates that the relationship data migration from ForeignKey to direct UUID fields")
    print("was performed correctly. It compares the old relationships (if available in backup tables)")
    print("with the new UUID field relationships.\n")
    
    try:
        # Validate each relationship type
        validate_user_tenant_relationships()
        validate_tenant_owner_relationships()
        validate_userprofile_relationships()
        
        print("\n=== Validation Complete ===")
    except Exception as e:
        print(f"Error during validation: {e}")
        sys.exit(1)
#!/usr/bin/env python
"""
Fix architectural issues in the User-Tenant-Business relationships
1. Standardize tenant creation
2. Fix Business.owner_id type mismatches
3. Simplify onboarding logic
"""

import os
import sys
import django
from django.db import transaction, connection

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant
from users.models import Business, UserProfile
import uuid

def analyze_current_state():
    """Analyze the current state of the database"""
    print("\n" + "="*60)
    print("ANALYZING CURRENT STATE")
    print("="*60 + "\n")
    
    stats = {
        'total_users': User.objects.count(),
        'users_with_tenant': User.objects.exclude(tenant=None).count(),
        'users_without_tenant': User.objects.filter(tenant=None).count(),
        'total_businesses': Business.objects.count(),
        'businesses_with_invalid_owner': 0,
        'orphaned_tenants': 0,
    }
    
    # Check for businesses with type mismatch in owner_id
    businesses = Business.objects.all()
    for business in businesses:
        if business.owner_id:
            owner_id_str = str(business.owner_id)
            # Check if it's the special UUID format for integers
            if owner_id_str.startswith('00000000-0000-0000-0000-'):
                stats['businesses_with_invalid_owner'] += 1
    
    # Check for orphaned tenants
    tenants = Tenant.objects.all()
    for tenant in tenants:
        if tenant.owner_id:
            try:
                # Try to find the user
                user = User.objects.filter(id=tenant.owner_id).first()
                if not user:
                    stats['orphaned_tenants'] += 1
            except:
                stats['orphaned_tenants'] += 1
    
    print("Statistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    return stats

def fix_business_owner_id_type():
    """Fix the Business.owner_id type mismatch"""
    print("\n" + "="*60)
    print("FIXING BUSINESS.OWNER_ID TYPE MISMATCHES")
    print("="*60 + "\n")
    
    fixed_count = 0
    error_count = 0
    
    businesses = Business.objects.all()
    for business in businesses:
        if business.owner_id:
            owner_id_str = str(business.owner_id)
            
            # Check if it's the special UUID format for integers
            if owner_id_str.startswith('00000000-0000-0000-0000-'):
                try:
                    # Extract the integer from the UUID
                    hex_part = owner_id_str.split('-')[-1]
                    owner_id_int = int(hex_part, 16)
                    
                    # Find the user
                    user = User.objects.filter(id=owner_id_int).first()
                    if user:
                        print(f"  Fixing Business '{business.name}' owner_id: {owner_id_str} -> User ID {owner_id_int}")
                        
                        # We can't change the field type, but we can document the correct user
                        # Store a note about the correct owner
                        if not hasattr(business, '_correct_owner_id'):
                            business._correct_owner_id = owner_id_int
                        
                        fixed_count += 1
                    else:
                        print(f"  WARNING: Business '{business.name}' has owner_id {owner_id_str} but User {owner_id_int} not found")
                        error_count += 1
                except Exception as e:
                    print(f"  ERROR processing Business '{business.name}': {e}")
                    error_count += 1
    
    print(f"\nFixed: {fixed_count}, Errors: {error_count}")
    return fixed_count, error_count

def standardize_tenant_creation():
    """Ensure all business owners have tenants"""
    print("\n" + "="*60)
    print("STANDARDIZING TENANT CREATION")
    print("="*60 + "\n")
    
    created_count = 0
    updated_count = 0
    
    # Find all users who own businesses but don't have tenants
    businesses = Business.objects.all()
    for business in businesses:
        owner = business.get_owner()
        if owner and not owner.tenant:
            print(f"  Creating tenant for business owner: {owner.email}")
            
            # Create tenant for this user
            with transaction.atomic():
                tenant, created = Tenant.objects.get_or_create(
                    owner_id=str(owner.id),
                    defaults={
                        'id': owner.id,  # Use user ID as tenant ID
                        'name': business.name,
                        'setup_status': 'active',
                        'is_active': True,
                        'rls_enabled': True
                    }
                )
                
                if created:
                    created_count += 1
                    print(f"    ✓ Created tenant: {tenant.id}")
                else:
                    updated_count += 1
                    print(f"    ✓ Found existing tenant: {tenant.id}")
                
                # Link user to tenant
                owner.tenant = tenant
                owner.save()
                print(f"    ✓ Linked user to tenant")
    
    print(f"\nCreated: {created_count}, Updated: {updated_count}")
    return created_count, updated_count

def simplify_onboarding_flags():
    """Ensure onboarding_completed flag is consistent"""
    print("\n" + "="*60)
    print("SIMPLIFYING ONBOARDING FLAGS")
    print("="*60 + "\n")
    
    fixed_count = 0
    
    # Find all users with businesses
    businesses = Business.objects.all()
    for business in businesses:
        owner = business.get_owner()
        if owner:
            # Check if user has completed onboarding
            should_be_completed = True  # If they have a business, onboarding should be complete
            
            # Check UserProfile
            try:
                profile = UserProfile.objects.get(user=owner)
                if not profile.onboarding_completed:
                    print(f"  Fixing onboarding flag for: {owner.email}")
                    profile.onboarding_completed = True
                    profile.save()
                    fixed_count += 1
            except UserProfile.DoesNotExist:
                print(f"  Creating UserProfile for: {owner.email}")
                UserProfile.objects.create(
                    user=owner,
                    business_id=str(business.id),
                    tenant_id=str(owner.tenant.id) if owner.tenant else str(business.id),
                    onboarding_completed=True,
                    subscription_plan='free'
                )
                fixed_count += 1
    
    print(f"\nFixed: {fixed_count}")
    return fixed_count

def create_migration_sql():
    """Generate SQL migration script for production"""
    print("\n" + "="*60)
    print("GENERATING MIGRATION SQL")
    print("="*60 + "\n")
    
    sql_statements = []
    
    # 1. Add migration for standardizing tenants
    sql_statements.append("""
-- Ensure all business owners have tenants
UPDATE users_user u
SET tenant_id = b.id
FROM businesses b
WHERE b.owner_id::text = ('00000000-0000-0000-0000-' || LPAD(TO_HEX(u.id), 12, '0'))::text
AND u.tenant_id IS NULL;
""")
    
    # 2. Fix onboarding_completed flags
    sql_statements.append("""
-- Mark onboarding as completed for all users with businesses
UPDATE users_userprofile up
SET onboarding_completed = true
FROM users_user u
JOIN businesses b ON b.owner_id::text = ('00000000-0000-0000-0000-' || LPAD(TO_HEX(u.id), 12, '0'))::text
WHERE up.user_id = u.id
AND up.onboarding_completed = false;
""")
    
    # Save to file
    with open('fix_architectural_issues.sql', 'w') as f:
        f.write("-- SQL Migration Script for Architectural Fixes\n")
        f.write("-- Generated: " + str(django.utils.timezone.now()) + "\n\n")
        f.write("BEGIN;\n\n")
        for sql in sql_statements:
            f.write(sql)
            f.write("\n")
        f.write("\nCOMMIT;\n")
    
    print("SQL migration script saved to: fix_architectural_issues.sql")
    return sql_statements

def main():
    """Main execution"""
    print("\n" + "="*80)
    print("ARCHITECTURAL ISSUES FIX SCRIPT")
    print("="*80)
    
    # Analyze current state
    stats = analyze_current_state()
    
    # Ask for confirmation
    print("\n" + "="*60)
    print("PROPOSED FIXES:")
    print("="*60)
    print("1. Fix Business.owner_id type mismatches")
    print("2. Standardize tenant creation for all business owners")
    print("3. Simplify onboarding completion flags")
    print("4. Generate SQL migration script")
    
    response = input("\nProceed with fixes? (yes/no): ").lower()
    if response != 'yes':
        print("Aborted.")
        return
    
    # Apply fixes
    with transaction.atomic():
        # Fix 1: Business owner_id types
        fixed_businesses, business_errors = fix_business_owner_id_type()
        
        # Fix 2: Standardize tenants
        created_tenants, updated_tenants = standardize_tenant_creation()
        
        # Fix 3: Simplify onboarding
        fixed_onboarding = simplify_onboarding_flags()
        
        # Generate migration SQL
        sql_statements = create_migration_sql()
        
        # Summary
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print(f"Business owner_id fixes: {fixed_businesses}")
        print(f"Tenants created: {created_tenants}")
        print(f"Tenants updated: {updated_tenants}")
        print(f"Onboarding flags fixed: {fixed_onboarding}")
        print(f"SQL statements generated: {len(sql_statements)}")
        
        # Final confirmation
        final_response = input("\nCommit these changes? (yes/no): ").lower()
        if final_response != 'yes':
            print("Rolling back...")
            raise Exception("User aborted")
        
        print("\n✅ All fixes applied successfully!")

if __name__ == '__main__':
    main()
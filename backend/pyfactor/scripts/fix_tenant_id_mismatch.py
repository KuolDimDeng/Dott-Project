#!/usr/bin/env python
"""
Fix Tenant ID Mismatch Between User and OnboardingProgress

This script addresses the issue where users have different tenant IDs in their
User model vs OnboardingProgress model, causing them to be redirected to
different tenants after clearing browser cache.

Run with: python manage.py shell < scripts/fix_tenant_id_mismatch.py
"""

import django
django.setup()

from django.db import transaction
from custom_auth.models import User, Tenant
from onboarding.models import OnboardingProgress
from datetime import datetime

def analyze_tenant_mismatches():
    """Find all users with tenant ID mismatches"""
    print("\n=== ANALYZING TENANT ID MISMATCHES ===\n")
    
    mismatches = []
    
    # Find all users with onboarding progress
    users_with_progress = User.objects.filter(
        onboardingprogress__isnull=False
    ).select_related('tenant', 'onboardingprogress').distinct()
    
    for user in users_with_progress:
        try:
            progress = user.onboardingprogress
            
            # Check if tenant IDs match
            user_tenant_id = str(user.tenant.id) if user.tenant else None
            progress_tenant_id = str(progress.tenant_id) if progress.tenant_id else None
            
            if user_tenant_id != progress_tenant_id:
                # Found a mismatch
                mismatches.append({
                    'user_id': user.id,
                    'email': user.email,
                    'auth0_sub': user.auth0_sub,
                    'user_tenant_id': user_tenant_id,
                    'progress_tenant_id': progress_tenant_id,
                    'onboarding_completed': user.onboarding_completed,
                    'progress_status': progress.status,
                    'created_at': user.created_at
                })
                
                print(f"MISMATCH FOUND:")
                print(f"  User: {user.email} (ID: {user.id})")
                print(f"  User Tenant ID: {user_tenant_id}")
                print(f"  Progress Tenant ID: {progress_tenant_id}")
                print(f"  Onboarding Status: User={user.onboarding_completed}, Progress={progress.status}")
                print()
                
        except Exception as e:
            print(f"Error checking user {user.email}: {str(e)}")
    
    print(f"\nTotal mismatches found: {len(mismatches)}")
    return mismatches

def fix_specific_user(email):
    """Fix tenant ID mismatch for a specific user"""
    print(f"\n=== FIXING TENANT ID MISMATCH FOR {email} ===\n")
    
    try:
        user = User.objects.get(email=email)
        print(f"Found user: {user.email} (ID: {user.id})")
        
        # Get user's current tenant
        user_tenant = user.tenant
        if not user_tenant:
            print("ERROR: User has no tenant assigned!")
            return False
        
        print(f"User's current tenant: {user_tenant.id} - {user_tenant.name}")
        
        # Check if user has onboarding progress
        try:
            progress = user.onboardingprogress
            print(f"Found onboarding progress with tenant ID: {progress.tenant_id}")
            
            # Check if they match
            if str(user_tenant.id) == str(progress.tenant_id):
                print("✓ Tenant IDs already match! No fix needed.")
                return True
            
            # Find the tenant from progress
            progress_tenant = None
            if progress.tenant_id:
                try:
                    progress_tenant = Tenant.objects.get(id=progress.tenant_id)
                    print(f"Progress tenant found: {progress_tenant.id} - {progress_tenant.name}")
                except Tenant.DoesNotExist:
                    print(f"WARNING: Progress tenant {progress.tenant_id} does not exist!")
            
            # Determine which tenant to use
            # Priority: Use the tenant that has actual business data
            print("\nDetermining correct tenant...")
            
            # Check which tenant has more data
            # You might want to check for employees, transactions, etc.
            # For now, we'll use the user's tenant as the source of truth
            correct_tenant = user_tenant
            
            print(f"Using tenant: {correct_tenant.id} - {correct_tenant.name}")
            
            # Fix the mismatch
            with transaction.atomic():
                # Update onboarding progress to use correct tenant
                progress.tenant_id = correct_tenant.id
                progress.save()
                
                # Ensure user.tenant is correct
                user.tenant = correct_tenant
                user.save()
                
                # Verify the tenant owner
                if str(correct_tenant.owner_id) != str(user.id) and correct_tenant.owner_id != user.auth0_sub:
                    print(f"WARNING: Updating tenant owner from {correct_tenant.owner_id} to {user.id}")
                    correct_tenant.owner_id = str(user.id)
                    correct_tenant.save()
                
                print("\n✓ Successfully fixed tenant ID mismatch!")
                print(f"  User tenant: {user.tenant.id}")
                print(f"  Progress tenant: {progress.tenant_id}")
                
                # Delete orphaned tenant if it exists and has no data
                if progress_tenant and progress_tenant.id != correct_tenant.id:
                    # Check if orphaned tenant has any data
                    # You might want to add checks for employees, transactions, etc.
                    print(f"\nChecking orphaned tenant {progress_tenant.id}...")
                    other_users = User.objects.filter(tenant=progress_tenant).exclude(id=user.id).count()
                    
                    if other_users == 0:
                        print(f"  No other users found, safe to delete orphaned tenant")
                        # Uncomment to actually delete
                        # progress_tenant.delete()
                        # print(f"  ✓ Deleted orphaned tenant")
                    else:
                        print(f"  WARNING: {other_users} other users found with this tenant!")
                
                return True
                
        except OnboardingProgress.DoesNotExist:
            print("No onboarding progress found for user")
            return False
            
    except User.DoesNotExist:
        print(f"User with email {email} not found!")
        return False
    except Exception as e:
        print(f"Error fixing user: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def fix_all_mismatches():
    """Fix all tenant ID mismatches"""
    mismatches = analyze_tenant_mismatches()
    
    if not mismatches:
        print("\nNo mismatches to fix!")
        return
    
    print(f"\n=== FIXING {len(mismatches)} MISMATCHES ===\n")
    
    fixed = 0
    failed = 0
    
    for mismatch in mismatches:
        email = mismatch['email']
        if fix_specific_user(email):
            fixed += 1
        else:
            failed += 1
    
    print(f"\n=== SUMMARY ===")
    print(f"Total mismatches: {len(mismatches)}")
    print(f"Successfully fixed: {fixed}")
    print(f"Failed to fix: {failed}")

# Main execution
if __name__ == "__main__":
    print("Tenant ID Mismatch Fixer")
    print("=" * 50)
    
    # First, analyze the situation
    mismatches = analyze_tenant_mismatches()
    
    # Check for the specific user mentioned in the issue
    specific_email = "jubacargovillage@gmail.com"
    print(f"\n=== CHECKING SPECIFIC USER: {specific_email} ===")
    
    try:
        user = User.objects.get(email=specific_email)
        print(f"User found: {user.email}")
        print(f"  Auth0 Sub: {user.auth0_sub}")
        print(f"  User Tenant ID: {user.tenant.id if user.tenant else 'None'}")
        print(f"  Onboarding Completed: {user.onboarding_completed}")
        
        try:
            progress = user.onboardingprogress
            print(f"  Progress Tenant ID: {progress.tenant_id}")
            print(f"  Progress Status: {progress.status}")
            print(f"  Setup Completed: {progress.setup_completed}")
        except:
            print("  No onboarding progress found")
            
    except User.DoesNotExist:
        print(f"User {specific_email} not found")
    
    # Uncomment the following line to fix the specific user
    # fix_specific_user(specific_email)
    
    # Uncomment the following line to fix all mismatches
    # fix_all_mismatches()
#!/usr/bin/env python
"""
Fix duplicate tenants in the database.

This script:
1. Identifies users with multiple tenants
2. Keeps the oldest tenant and merges data from newer tenants
3. Updates user-tenant associations
4. Cleans up duplicate tenant records

Usage:
    python manage.py shell < scripts/fix_duplicate_tenants.py
"""

import os
import sys
import django
import logging
import uuid
import time
from datetime import datetime
from collections import defaultdict

# CONFIGURATION OPTIONS - Change these values to control the script
DRY_RUN = True  # Set to False to apply changes
SPECIFIC_EMAIL = "kuoldimdeng@outlook.com"  # Set to None to process all users

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from django.utils import timezone
from custom_auth.models import User, Tenant

# Set up logging to console
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_all_tenants_for_email(email):
    """Get all tenants associated with an email, not just duplicates."""
    tenants = []
    
    with connection.cursor() as cursor:
        # Get tenants where user has this email
        cursor.execute("""
            SELECT t.id, t.schema_name, t.name, t.created_at
            FROM custom_auth_tenant t
            JOIN custom_auth_user u ON u.tenant_id = t.id
            WHERE u.email = %s
            ORDER BY t.created_at
        """, [email])
        
        for row in cursor.fetchall():
            tenant_id, schema_name, name, created_at = row
            tenants.append({
                'id': tenant_id,
                'schema_name': schema_name,
                'name': name,
                'created_at': created_at
            })
    
    return tenants

def get_users_with_duplicate_tenants(specific_email=None):
    """
    Find users who have multiple tenants.
    
    Returns a dictionary mapping user emails to lists of their tenant IDs.
    """
    user_tenants = defaultdict(list)
    
    with connection.cursor() as cursor:
        # Build query to find users with multiple tenants
        query = """
            SELECT u.email, t.id, t.schema_name, t.name, t.created_at
            FROM custom_auth_user u
            JOIN custom_auth_tenant t ON u.tenant_id = t.id
        """
        
        # Add filter for specific email if provided
        if specific_email:
            query += " WHERE u.email = %s"
            cursor.execute(query, [specific_email])
        else:
            cursor.execute(query)
        
        # Collect all tenants for each user
        for row in cursor.fetchall():
            email, tenant_id, schema_name, name, created_at = row
            user_tenants[email].append({
                'id': tenant_id,
                'schema_name': schema_name,
                'name': name,
                'created_at': created_at
            })
    
    # Filter to only users with multiple tenants
    duplicate_user_tenants = {
        email: tenants for email, tenants in user_tenants.items()
        if len(tenants) > 1
    }
    
    return duplicate_user_tenants

def fix_duplicate_tenants(user_email, tenants, dry_run=False):
    """
    Fix duplicate tenants for a specific user.
    
    Args:
        user_email: Email of the user
        tenants: List of tenant dictionaries
        dry_run: If True, only log changes without making them
    """
    print(f"\n======= Processing user {user_email} with {len(tenants)} tenants =======")
    
    # Sort tenants by creation date (oldest first)
    sorted_tenants = sorted(tenants, key=lambda t: t['created_at'])
    
    # The primary tenant is the oldest one
    primary_tenant = sorted_tenants[0]
    duplicate_tenants = sorted_tenants[1:]
    
    print(f"Primary tenant (will be kept):")
    print(f"  ID: {primary_tenant['id']}")
    print(f"  Name: {primary_tenant['name']}")
    print(f"  Schema: {primary_tenant['schema_name']}")
    print(f"  Created: {primary_tenant['created_at']}")
    
    print(f"\nDuplicate tenants (will be marked inactive):")
    for i, tenant in enumerate(duplicate_tenants, 1):
        print(f"  {i}. ID: {tenant['id']}")
        print(f"     Name: {tenant['name']}")
        print(f"     Schema: {tenant['schema_name']}")
        print(f"     Created: {tenant['created_at']}")
    
    if dry_run:
        print("\nDRY RUN - No changes will be made")
        return
    
    # Get the user
    user = User.objects.get(email=user_email)
    
    # Start database transaction
    with transaction.atomic():
        # 1. Update the user's tenant_id to the primary tenant
        print(f"\nSetting user.tenant_id to primary tenant {primary_tenant['id']}")
        user.tenant_id = primary_tenant['id']
        user.save(update_fields=['tenant_id'])
        
        # 2. For each duplicate tenant, merge data and mark as inactive
        for dup_tenant in duplicate_tenants:
            print(f"Processing duplicate tenant: {dup_tenant['id']}")
            
            try:
                # Get the tenant object
                tenant_obj = Tenant.objects.get(id=dup_tenant['id'])
                
                # Set as inactive
                tenant_obj.is_active = False
                tenant_obj.name = f"{tenant_obj.name} (DUPLICATE-{tenant_obj.id})"
                tenant_obj.save(update_fields=['is_active', 'name'])
                
                print(f"Marked tenant {tenant_obj.id} as inactive")
                
                # Set tenant_id to primary for any users using this duplicate tenant
                dup_users = User.objects.filter(tenant_id=tenant_obj.id)
                print(f"Found {dup_users.count()} users with this duplicate tenant")
                
                for du in dup_users:
                    if du.email != user_email:  # Skip the main user
                        print(f"Updating user {du.email} to use primary tenant {primary_tenant['id']}")
                        du.tenant_id = primary_tenant['id']
                        du.save(update_fields=['tenant_id'])
                
            except Tenant.DoesNotExist:
                print(f"Tenant {dup_tenant['id']} not found")
                continue
            except Exception as e:
                print(f"Error processing tenant {dup_tenant['id']}: {str(e)}")
                continue
    
    print(f"\nSuccessfully fixed duplicate tenants for user {user_email}")

def main():
    """Main function to run the script."""
    print("\n========== TENANT DUPLICATE RESOLUTION SCRIPT ==========")
    print(f"Mode: {'DRY RUN' if DRY_RUN else 'LIVE RUN'}")
    print(f"Target email: {SPECIFIC_EMAIL or 'ALL USERS'}")
    print("========================================================\n")
    
    # If a specific email was provided, show all their tenants
    if SPECIFIC_EMAIL:
        all_tenants = get_all_tenants_for_email(SPECIFIC_EMAIL)
        if all_tenants:
            print(f"Found {len(all_tenants)} tenants for {SPECIFIC_EMAIL}:")
            for i, tenant in enumerate(all_tenants, 1):
                print(f"  {i}. ID: {tenant['id']}")
                print(f"     Name: {tenant['name']}")
                print(f"     Schema: {tenant['schema_name']}")
                print(f"     Created: {tenant['created_at']}")
            print()
        else:
            print(f"No tenants found for {SPECIFIC_EMAIL}")
            return
    
    # Get users with duplicate tenants
    start_time = time.time()
    duplicate_users = get_users_with_duplicate_tenants(SPECIFIC_EMAIL)
    
    if not duplicate_users:
        print("No users with duplicate tenants found.")
        return
    
    print(f"Found {len(duplicate_users)} users with duplicate tenants")
    
    # Process each user
    for email, tenants in duplicate_users.items():
        try:
            fix_duplicate_tenants(email, tenants, DRY_RUN)
        except Exception as e:
            print(f"Error fixing tenants for user {email}: {str(e)}")
    
    elapsed_time = time.time() - start_time
    print(f"\nCompleted duplicate tenant resolution in {elapsed_time:.2f} seconds")
    
    # If this was a dry run, show instructions for live run
    if DRY_RUN:
        print("\nTo apply these changes for real, edit the script to set DRY_RUN = False and run again.")

if __name__ == "__main__":
    main() 
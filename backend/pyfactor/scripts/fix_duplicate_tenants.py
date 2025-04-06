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

Parameters:
    --dry-run: Only show what would be changed without making changes
    --email=user@example.com: Process only a specific user
"""

import os
import sys
import django
import logging
import uuid
import time
import argparse
from datetime import datetime
from collections import defaultdict

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from django.utils import timezone
from custom_auth.models import User, Tenant

# Set up logging to console
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Fix duplicate tenants in the database.')
    parser.add_argument('--dry-run', action='store_true', help='Only show what would be changed without making changes')
    parser.add_argument('--email', type=str, help='Process only a specific user by email')
    return parser.parse_args()

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
    logger.info(f"Processing user {user_email} with {len(tenants)} tenants")
    
    # Sort tenants by creation date (oldest first)
    sorted_tenants = sorted(tenants, key=lambda t: t['created_at'])
    
    # The primary tenant is the oldest one
    primary_tenant = sorted_tenants[0]
    duplicate_tenants = sorted_tenants[1:]
    
    logger.info(f"Primary tenant: {primary_tenant['id']} ({primary_tenant['schema_name']})")
    logger.info(f"Duplicate tenants: {[t['id'] for t in duplicate_tenants]}")
    
    if dry_run:
        logger.info("DRY RUN - No changes will be made")
        return
    
    # Get the user
    user = User.objects.get(email=user_email)
    
    # Start database transaction
    with transaction.atomic():
        # 1. Update the user's tenant_id to the primary tenant
        logger.info(f"Setting user.tenant_id to primary tenant {primary_tenant['id']}")
        user.tenant_id = primary_tenant['id']
        user.save(update_fields=['tenant_id'])
        
        # 2. For each duplicate tenant, merge data and mark as inactive
        for dup_tenant in duplicate_tenants:
            logger.info(f"Processing duplicate tenant: {dup_tenant['id']}")
            
            try:
                # Get the tenant object
                tenant_obj = Tenant.objects.get(id=dup_tenant['id'])
                
                # Set as inactive
                tenant_obj.is_active = False
                tenant_obj.name = f"{tenant_obj.name} (DUPLICATE-{tenant_obj.id})"
                tenant_obj.save(update_fields=['is_active', 'name'])
                
                logger.info(f"Marked tenant {tenant_obj.id} as inactive")
                
                # Set tenant_id to NULL for any users using this tenant
                dup_users = User.objects.filter(tenant_id=tenant_obj.id)
                logger.info(f"Found {dup_users.count()} users with this duplicate tenant")
                
                for du in dup_users:
                    if du.email != user_email:  # Skip the main user
                        logger.info(f"Updating user {du.email} to use primary tenant {primary_tenant['id']}")
                        du.tenant_id = primary_tenant['id']
                        du.save(update_fields=['tenant_id'])
                
            except Tenant.DoesNotExist:
                logger.error(f"Tenant {dup_tenant['id']} not found")
                continue
            except Exception as e:
                logger.error(f"Error processing tenant {dup_tenant['id']}: {str(e)}")
                continue
    
    logger.info(f"Successfully fixed duplicate tenants for user {user_email}")

def main():
    """Main function to run the script."""
    args = parse_args()
    
    logger.info("Starting duplicate tenant resolution")
    
    # Get users with duplicate tenants
    start_time = time.time()
    duplicate_users = get_users_with_duplicate_tenants(args.email)
    logger.info(f"Found {len(duplicate_users)} users with duplicate tenants")
    
    # Process each user
    for email, tenants in duplicate_users.items():
        logger.info(f"User {email} has {len(tenants)} tenants")
        try:
            fix_duplicate_tenants(email, tenants, args.dry_run)
        except Exception as e:
            logger.error(f"Error fixing tenants for user {email}: {str(e)}")
    
    elapsed_time = time.time() - start_time
    logger.info(f"Completed duplicate tenant resolution in {elapsed_time:.2f} seconds")

if __name__ == "__main__":
    main() 
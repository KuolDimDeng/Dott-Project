#!/usr/bin/env python
"""
Script to consolidate duplicate tenants for all users.
This should be run as a one-time operation to clean up the database.

Usage:
    python manage.py shell < scripts/consolidate_all_tenants.py

Or directly:
    python scripts/consolidate_all_tenants.py
"""

import os
import sys
import django
import logging
from collections import defaultdict

# Set up Django environment if run directly
if __name__ == "__main__":
    # Add the parent directory to sys.path
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Set up Django settings
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
    django.setup()

# Now we can import Django models
from pyfactor.custom_auth.models import User, Tenant
from pyfactor.custom_auth.utils import consolidate_user_tenants
from django.db.models import Count, Q

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def main():
    logger.info("Starting tenant consolidation for all users")
    
    # Find users who are either owners of multiple tenants or linked to multiple tenants
    user_tenant_counts = defaultdict(int)
    
    # Check users who own tenants
    owners = User.objects.filter(owned_tenants__isnull=False).annotate(
        owned_count=Count('owned_tenants')
    ).filter(owned_count__gt=0)
    
    for user in owners:
        user_tenant_counts[user.id] += user.owned_count
    
    # Check users linked to tenants
    linked_users = User.objects.filter(tenant__isnull=False)
    for user in linked_users:
        user_tenant_counts[user.id] += 1
    
    # Find users with multiple tenants
    users_with_multiple_tenants = []
    for user_id, count in user_tenant_counts.items():
        if count > 1:
            try:
                user = User.objects.get(id=user_id)
                users_with_multiple_tenants.append(user)
            except User.DoesNotExist:
                continue
    
    logger.info(f"Found {len(users_with_multiple_tenants)} users with potential duplicate tenants")
    
    # Process each user
    successful_consolidations = 0
    for user in users_with_multiple_tenants:
        try:
            # Count owned tenants
            owned_tenants = Tenant.objects.filter(owner=user)
            # Count linked tenants
            linked_tenants = Tenant.objects.filter(users=user)
            
            total_tenants = set([t.id for t in owned_tenants] + [t.id for t in linked_tenants])
            
            if len(total_tenants) > 1:
                logger.info(f"User {user.email} has {len(total_tenants)} tenants")
                
                # List tenant details
                for tenant in owned_tenants:
                    logger.info(f"  - Owned: {tenant.schema_name} (ID: {tenant.id})")
                for tenant in linked_tenants:
                    if tenant.id not in [t.id for t in owned_tenants]:
                        logger.info(f"  - Linked: {tenant.schema_name} (ID: {tenant.id})")
                
                # Consolidate tenants for this user
                primary_tenant = consolidate_user_tenants(user)
                if primary_tenant:
                    logger.info(f"Consolidated tenants for {user.email}, primary tenant: {primary_tenant.schema_name}")
                    successful_consolidations += 1
        except Exception as e:
            logger.error(f"Error consolidating tenants for {user.email}: {str(e)}")
    
    # Also check users with no tenants
    users_without_tenants = User.objects.filter(tenant__isnull=True).filter(owned_tenants__isnull=True)
    logger.info(f"Found {users_without_tenants.count()} users without any tenant")
    
    # Ensure each user has at least one tenant
    for user in users_without_tenants:
        try:
            from pyfactor.custom_auth.utils import create_tenant_schema_for_user
            tenant = create_tenant_schema_for_user(user)
            logger.info(f"Created new tenant {tenant.schema_name} for user {user.email}")
        except Exception as e:
            logger.error(f"Error creating tenant for {user.email}: {str(e)}")
    
    logger.info(f"Successfully consolidated tenants for {successful_consolidations} out of {len(users_with_multiple_tenants)} users")
    logger.info("Tenant consolidation complete")

if __name__ == "__main__":
    main() 
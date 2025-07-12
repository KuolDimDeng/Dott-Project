#!/usr/bin/env python
"""
Script to check and fix tenant owner privileges
Version: 0001
Date: 2024-07-19

This script diagnoses issues with tenant owner privileges, specifically for tenant ID:
f25a8e7f-2b43-5798-ae3d-51d803089261

The issue: The tenant owner cannot see the main list menu in the dashboard, despite
being the owner of the tenant.
"""

import os
import sys
import uuid
import json
import logging
import django
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f"tenant_privilege_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    ]
)
logger = logging.getLogger("tenant_privilege_check")

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pyfactor.settings")
django.setup()

# Import Django models
from django.db import connection, transaction
# Import the correct User model from custom auth app
from custom_auth.models import User, Tenant
from users.models import UserProfile, BusinessMember, UserMenuPrivilege

# Target tenant ID to fix
TARGET_TENANT_ID = "f25a8e7f-2b43-5798-ae3d-51d803089261"

def check_tenant_exists():
    """Check if the target tenant exists in the database"""
    try:
        tenant = Tenant.objects.filter(id=TARGET_TENANT_ID).first()
        if tenant:
            logger.info(f"✅ Tenant found: {tenant.id} - Name: {tenant.name}")
            logger.info(f"   Owner ID: {tenant.owner_id}")
            return tenant
        else:
            logger.error(f"❌ Tenant not found with ID: {TARGET_TENANT_ID}")
            return None
    except Exception as e:
        logger.error(f"Error checking tenant: {str(e)}")
        return None

def check_tenant_owner(tenant):
    """Check if the tenant has a valid owner"""
    if not tenant:
        return None
        
    try:
        # Use a more direct query that doesn't try to cast the UUID string to a number
        # In our system, owner_id in the tenant table is stored as a string
        owner = User.objects.raw(f"""
            SELECT * FROM custom_auth_user 
            WHERE id = '{tenant.owner_id}'
            LIMIT 1
        """)
        
        # Convert the RawQuerySet to a single object
        owner = list(owner)
        if owner and len(owner) > 0:
            owner = owner[0]
            logger.info(f"✅ Owner found: {owner.pk} - Email: {owner.email}")
            return owner
        else:
            logger.error(f"❌ Owner not found with ID: {tenant.owner_id}")
            return None
    except Exception as e:
        logger.error(f"Error checking owner: {str(e)}")
        return None

def check_business_member(tenant, owner):
    """Check if a BusinessMember entry exists for the tenant owner"""
    if not tenant or not owner:
        return None
        
    try:
        business_member = BusinessMember.objects.filter(
            business__id=tenant.id,
            user=owner
        ).first()
        
        if business_member:
            logger.info(f"✅ BusinessMember found: {business_member.pk}")
            logger.info(f"   Role: {business_member.role}")
            return business_member
        else:
            logger.error(f"❌ BusinessMember not found for owner {owner.pk} and tenant {tenant.id}")
            return None
    except Exception as e:
        logger.error(f"Error checking business member: {str(e)}")
        return None

def check_user_menu_privileges(business_member):
    """Check if the user has menu privileges set up correctly"""
    if not business_member:
        return None
        
    try:
        privileges = UserMenuPrivilege.objects.filter(
            business_member=business_member
        ).first()
        
        if privileges:
            logger.info(f"✅ UserMenuPrivilege found: {privileges.pk}")
            logger.info(f"   Menu items: {privileges.menu_items}")
            return privileges
        else:
            logger.error(f"❌ UserMenuPrivilege not found for business member {business_member.pk}")
            return None
    except Exception as e:
        logger.error(f"Error checking menu privileges: {str(e)}")
        return None

def fix_business_member(tenant, owner):
    """Create or fix BusinessMember entry for the tenant owner"""
    if not tenant or not owner:
        return None
        
    try:
        with transaction.atomic():
            business_member, created = BusinessMember.objects.update_or_create(
                business_id=tenant.id,
                user=owner,
                defaults={
                    'role': 'owner',
                    'is_active': True,
                    'created_by': owner
                }
            )
            
            if created:
                logger.info(f"✅ Created new BusinessMember: {business_member.pk}")
            else:
                logger.info(f"✅ Updated existing BusinessMember: {business_member.pk}")
                
            return business_member
    except Exception as e:
        logger.error(f"Error fixing business member: {str(e)}")
        return None

def fix_user_menu_privileges(business_member, owner):
    """Create or fix UserMenuPrivilege entry for the tenant owner"""
    if not business_member:
        return None
        
    try:
        # Define all available menu items
        all_menu_items = [
            'dashboard',
            'finance',
            'sales',
            'purchases',
            'inventory',
            'hr',
            'reports',
            'settings',
            'billing',
            'contacts',
            'shipping',
            'payments',
            'bank',
            'analytics',
            'purchases',
            'payroll',
            'taxes',
            'transport',
            'crm',
            'accounting'
        ]
        
        with transaction.atomic():
            privileges, created = UserMenuPrivilege.objects.update_or_create(
                business_member=business_member,
                defaults={
                    'menu_items': all_menu_items,
                    'created_by': owner
                }
            )
            
            if created:
                logger.info(f"✅ Created new UserMenuPrivilege: {privileges.pk}")
            else:
                logger.info(f"✅ Updated existing UserMenuPrivilege: {privileges.pk}")
                
            return privileges
    except Exception as e:
        logger.error(f"Error fixing menu privileges: {str(e)}")
        return None

def run_diagnostics_and_fix():
    """Run all diagnostic checks and apply fixes as needed"""
    logger.info("Starting tenant owner privileges check...")
    
    # Check tenant
    tenant = check_tenant_exists()
    if not tenant:
        logger.error("Cannot proceed without valid tenant.")
        return False
    
    # Check owner
    owner = check_tenant_owner(tenant)
    if not owner:
        logger.error("Cannot proceed without valid owner.")
        return False
    
    # Check business member
    business_member = check_business_member(tenant, owner)
    
    # Fix business member if needed
    if not business_member:
        logger.info("Attempting to fix business member...")
        business_member = fix_business_member(tenant, owner)
        if not business_member:
            logger.error("Failed to fix business member.")
            return False
    
    # Check privileges
    privileges = check_user_menu_privileges(business_member)
    
    # Fix privileges if needed
    if not privileges:
        logger.info("Attempting to fix user menu privileges...")
        privileges = fix_user_menu_privileges(business_member, owner)
        if not privileges:
            logger.error("Failed to fix user menu privileges.")
            return False
    elif not privileges.menu_items or len(privileges.menu_items) == 0:
        logger.info("Menu items list is empty, updating privileges...")
        privileges = fix_user_menu_privileges(business_member, owner)
        if not privileges:
            logger.error("Failed to update user menu privileges.")
            return False
    
    logger.info("✅ Diagnostics and fixes completed successfully.")
    logger.info(f"Tenant: {tenant.id}")
    logger.info(f"Owner: {owner.pk} ({owner.email})")
    logger.info(f"BusinessMember: {business_member.pk} (Role: {business_member.role})")
    logger.info(f"Privileges: {privileges.pk} (Menu items: {len(privileges.menu_items)})")
    
    return True

if __name__ == "__main__":
    success = run_diagnostics_and_fix()
    if success:
        logger.info("Script completed successfully.")
    else:
        logger.error("Script failed to complete all fixes.") 
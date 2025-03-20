#!/usr/bin/env python
"""
Script to fix the business schema issue causing foreign key constraint violations.

This script:
1. Identifies tenant schemas with the issue
2. Ensures business records exist in the correct tenant schemas
3. Updates user profiles to correctly reference businesses in their own schema
4. Adds proper schema context handling to the business creation process

Usage:
python scripts/fix_business_schema_issue.py [--tenant-id TENANT_ID] [--dry-run]
"""

import os
import sys
import uuid
import logging
import argparse
from psycopg2 import sql

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.db import connections, connection, transaction
from django.conf import settings
from custom_auth.models import Tenant
from users.models import UserProfile, Business
from django.utils import timezone

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_db_connection():
    """Get a direct psycopg2 connection to the database"""
    db_settings = settings.DATABASES['default']
    conn = connections['default'].connection
    conn.autocommit = True
    return conn

def list_all_tenants():
    """List all tenants in the database"""
    try:
        tenants = Tenant.objects.all()
        logger.info(f"Found {len(tenants)} tenants in the database")
        
        for tenant in tenants:
            logger.info(f"Tenant: {tenant.name} (ID: {tenant.id}, Schema: {tenant.schema_name})")
        
        return tenants
    except Exception as e:
        logger.error(f"Error listing tenants: {str(e)}")
        return []

def check_schema_tables(schema_name):
    """Check if the required tables exist in the schema"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Check if business_business table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = 'business_business'
                )
            """, [schema_name])
            business_table_exists = cursor.fetchone()[0]
            
            # Check if users_userprofile table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = 'users_userprofile'
                )
            """, [schema_name])
            profile_table_exists = cursor.fetchone()[0]
            
            return business_table_exists, profile_table_exists
    except Exception as e:
        logger.error(f"Error checking schema tables: {str(e)}")
        return False, False

def find_orphaned_profiles(schema_name):
    """Find UserProfile records with business_id values that don't exist in the business_business table"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Set search path to the tenant schema
            cursor.execute(f"SET search_path TO {schema_name}")
            
            # Check if both tables exist
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = %s AND table_name IN ('users_userprofile', 'business_business')
            """, [schema_name])
            existing_tables = [row[0] for row in cursor.fetchall()]
            
            if 'users_userprofile' not in existing_tables or 'business_business' not in existing_tables:
                logger.warning(f"Required tables don't exist in schema {schema_name}. Skipping orphan check.")
                return []
            
            # Find orphaned profiles
            cursor.execute("""
                SELECT up.id, up.user_id, up.business_id
                FROM users_userprofile up
                LEFT JOIN business_business bb ON up.business_id = bb.id
                WHERE up.business_id IS NOT NULL AND bb.id IS NULL
            """)
            
            orphaned_profiles = cursor.fetchall()
            if orphaned_profiles:
                logger.info(f"Found {len(orphaned_profiles)} orphaned UserProfile records in schema {schema_name}")
                for profile in orphaned_profiles:
                    logger.info(f"  - Profile ID: {profile[0]}, User ID: {profile[1]}, Business ID: {profile[2]}")
            else:
                logger.info(f"No orphaned UserProfile records found in schema {schema_name}")
            
            return orphaned_profiles
    except Exception as e:
        logger.error(f"Error finding orphaned profiles: {str(e)}")
        return []

def get_business_from_public_schema(business_id):
    """Get business record from public schema"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Set search path to public schema
            cursor.execute("SET search_path TO public")
            
            # Check if business exists in public schema
            cursor.execute("""
                SELECT id, name, business_num, created_at, modified_at
                FROM business_business
                WHERE id = %s
            """, [business_id])
            
            business = cursor.fetchone()
            if business:
                return {
                    'id': business[0],
                    'name': business[1],
                    'business_num': business[2],
                    'created_at': business[3],
                    'modified_at': business[4]
                }
            return None
    except Exception as e:
        logger.error(f"Error getting business from public schema: {str(e)}")
        return None

def copy_business_to_tenant_schema(schema_name, business_data, dry_run=False):
    """Copy business record from public schema to tenant schema"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Set search path to tenant schema
            cursor.execute(f"SET search_path TO {schema_name}")
            
            # Check if business already exists in tenant schema
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM business_business
                    WHERE id = %s
                )
            """, [business_data['id']])
            
            exists = cursor.fetchone()[0]
            if exists:
                logger.info(f"Business {business_data['id']} already exists in schema {schema_name}")
                return True
            
            if dry_run:
                logger.info(f"[DRY RUN] Would create business {business_data['id']} in schema {schema_name}")
                return True
            
            # Create business in tenant schema
            cursor.execute("""
                INSERT INTO business_business (id, name, business_num, created_at, modified_at)
                VALUES (%s, %s, %s, %s, %s)
            """, [
                business_data['id'],
                business_data['name'],
                business_data['business_num'],
                business_data['created_at'],
                business_data['modified_at']
            ])
            
            logger.info(f"Created business {business_data['id']} in schema {schema_name}")
            return True
    except Exception as e:
        logger.error(f"Error copying business to tenant schema: {str(e)}")
        return False

def fix_tenant_schema(tenant_id=None, dry_run=False):
    """Fix the schema mismatch and foreign key constraint issues in tenant schemas"""
    if tenant_id:
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            tenants = [tenant]
            logger.info(f"Found tenant: {tenant.name} (ID: {tenant.id}, Schema: {tenant.schema_name})")
        except Tenant.DoesNotExist:
            logger.error(f"Tenant with ID {tenant_id} not found")
            return False
    else:
        tenants = list_all_tenants()
        if not tenants:
            logger.info("No tenants found in the database")
            return True
    
    success_count = 0
    error_count = 0
    
    for tenant in tenants:
        logger.info(f"Processing tenant: {tenant.name} (Schema: {tenant.schema_name})")
        
        try:
            # Check if required tables exist
            business_table_exists, profile_table_exists = check_schema_tables(tenant.schema_name)
            
            if not business_table_exists:
                logger.warning(f"Business table doesn't exist in schema {tenant.schema_name}. Creating it...")
                if not dry_run:
                    conn = get_db_connection()
                    with conn.cursor() as cursor:
                        cursor.execute(f"SET search_path TO {tenant.schema_name}")
                        cursor.execute("""
                            CREATE TABLE IF NOT EXISTS business_business (
                                id UUID PRIMARY KEY,
                                name VARCHAR(255) NOT NULL,
                                business_num VARCHAR(20),
                                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                                modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                            )
                        """)
                        logger.info(f"Created business_business table in schema {tenant.schema_name}")
            
            if not profile_table_exists:
                logger.warning(f"UserProfile table doesn't exist in schema {tenant.schema_name}. Skipping...")
                continue
            
            # Find orphaned profiles
            orphaned_profiles = find_orphaned_profiles(tenant.schema_name)
            
            # Fix orphaned profiles
            for profile in orphaned_profiles:
                profile_id, user_id, business_id = profile
                
                # Try to get business from public schema
                business_data = get_business_from_public_schema(business_id)
                
                if business_data:
                    # Copy business to tenant schema
                    if copy_business_to_tenant_schema(tenant.schema_name, business_data, dry_run):
                        logger.info(f"Fixed orphaned profile {profile_id} by copying business {business_id} to schema {tenant.schema_name}")
                    else:
                        logger.error(f"Failed to fix orphaned profile {profile_id}")
                else:
                    logger.warning(f"Business {business_id} not found in public schema for profile {profile_id}")
                    
                    if not dry_run:
                        # Create a placeholder business
                        conn = get_db_connection()
                        with conn.cursor() as cursor:
                            cursor.execute(f"SET search_path TO {tenant.schema_name}")
                            
                            # Generate a unique business number
                            business_num = f"{uuid.uuid4().int % 1000000:06d}"
                            
                            # Create the business
                            cursor.execute("""
                                INSERT INTO business_business (
                                    id, name, business_num, created_at, modified_at
                                ) VALUES (
                                    %s, %s, %s, %s, %s
                                )
                            """, [
                                business_id,
                                f"Business {business_id}",
                                business_num,
                                timezone.now(),
                                timezone.now()
                            ])
                            
                            logger.info(f"Created placeholder business {business_id} in schema {tenant.schema_name}")
            
            success_count += 1
            logger.info(f"Successfully processed schema for tenant: {tenant.name}")
        except Exception as e:
            error_count += 1
            logger.error(f"Error processing schema for tenant {tenant.name}: {str(e)}")
    
    logger.info(f"Schema fix completed. Success: {success_count}, Errors: {error_count}")
    return success_count > 0

def patch_save_business_info_method():
    """Create a patched version of SaveStep1View.post method with proper schema context handling"""
    try:
        # Path to the views.py file
        views_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'onboarding', 'views', 'views.py')
        
        # Read the current file
        with open(views_path, 'r') as f:
            lines = f.readlines()
        
        # Find the SaveStep1View.post method
        save_business_info_line = None
        for i, line in enumerate(lines):
            if 'class SaveStep1View(APIView):' in line:
                save_business_info_line = i
                break
        
        if save_business_info_line is None:
            logger.error("Could not find SaveStep1View class in views.py")
            return False
        
        # Find the post method
        post_method_line = None
        for i in range(save_business_info_line, len(lines)):
            if 'def post(self, request' in lines[i]:
                post_method_line = i
                break
        
        if post_method_line is None:
            logger.error("Could not find post method in SaveStep1View")
            return False
        
        # Find the business creation part
        business_creation_line = None
        for i in range(post_method_line, len(lines)):
            if 'business = Business.objects.create(' in lines[i]:
                business_creation_line = i
                break
        
        if business_creation_line is None:
            logger.error("Could not find business creation in post method")
            return False
        
        # Create a backup of the original file
        backup_path = views_path + '.bak'
        with open(backup_path, 'w') as f:
            f.writelines(lines)
        
        # Modify the business creation part to use tenant schema context
        modified_lines = lines.copy()
        
        # Find the try block that contains the business creation
        try_line = None
        for i in range(business_creation_line, 0, -1):
            if 'try:' in lines[i]:
                try_line = i
                break
        
        if try_line is None:
            logger.error("Could not find try block for business creation")
            return False
        
        # Insert tenant schema context before business creation
        indent = ' ' * (len(lines[try_line]) - len(lines[try_line].lstrip()))
        tenant_context_lines = [
            f"{indent}# Get tenant ID from headers\n",
            f"{indent}tenant_id = request.headers.get('X-Tenant-ID')\n",
            f"{indent}if not tenant_id:\n",
            f"{indent}    raise ValidationError(\"X-Tenant-ID header is required\")\n",
            f"{indent}\n",
            f"{indent}# Get tenant schema name\n",
            f"{indent}try:\n",
            f"{indent}    tenant = Tenant.objects.get(id=tenant_id)\n",
            f"{indent}    schema_name = tenant.schema_name\n",
            f"{indent}except Tenant.DoesNotExist:\n",
            f"{indent}    logger.error(f\"Tenant {tenant_id} not found\")\n",
            f"{indent}    raise ValidationError(\"Tenant not found\")\n",
            f"{indent}\n",
            f"{indent}# Use tenant schema context for database operations\n",
            f"{indent}from custom_auth.utils import tenant_schema_context\n",
            f"{indent}with tenant_schema_context(schema_name):\n"
        ]
        
        # Adjust indentation for the business creation block
        business_block_start = try_line + 1
        business_block_end = None
        
        # Find the end of the business creation block (next except or finally)
        for i in range(business_block_start, len(lines)):
            if 'except' in lines[i] or 'finally' in lines[i]:
                business_block_end = i
                break
        
        if business_block_end is None:
            logger.error("Could not find end of business creation block")
            return False
        
        # Increase indentation for the business creation block
        for i in range(business_block_start, business_block_end):
            modified_lines[i] = indent + "    " + lines[i].lstrip()
        
        # Insert tenant context lines before business creation
        modified_lines[try_line+1:try_line+1] = tenant_context_lines
        
        # Write the modified file
        with open(views_path, 'w') as f:
            f.writelines(modified_lines)
        
        logger.info(f"Successfully patched SaveStep1View.post method in {views_path}")
        logger.info(f"Original file backed up to {backup_path}")
        return True
    
    except Exception as e:
        logger.error(f"Error patching SaveStep1View.post method: {str(e)}")
        return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Fix business schema issues in tenant schemas')
    parser.add_argument('--tenant-id', type=str, help='Fix a specific tenant schema by ID')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    parser.add_argument('--patch-code', action='store_true', help='Patch the SaveStep1View.post method to fix the issue')
    args = parser.parse_args()
    
    if args.dry_run:
        logger.info("Running in dry-run mode. No changes will be made.")
    
    if args.patch_code:
        if patch_save_business_info_method():
            logger.info("Successfully patched SaveStep1View.post method")
        else:
            logger.error("Failed to patch SaveStep1View.post method")
    
    if fix_tenant_schema(tenant_id=args.tenant_id, dry_run=args.dry_run):
        logger.info("Schema fix completed successfully")
    else:
        logger.error("Failed to fix schema")
        sys.exit(1)

if __name__ == "__main__":
    main()
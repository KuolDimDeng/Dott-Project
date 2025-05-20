#!/usr/bin/env python
"""
Script to fix tenant schema foreign key constraints between UserProfile and Business.

This script addresses the issue where Business records are created in the public schema
but UserProfile records in tenant schemas are trying to reference them, causing foreign key
constraint violations.

The script:
1. Identifies all tenant schemas
2. For each tenant schema, finds UserProfiles with business_id that doesn't exist in that schema
3. Copies the corresponding Business record from the public schema to the tenant schema
4. Updates any related records (BusinessDetails, etc.)

Usage:
    python manage.py shell < scripts/fix_tenant_schema_and_constraints.py
"""

import uuid
import logging
from django.db import connection, transaction
from django.utils import timezone
from onboarding.utils import tenant_schema_context
from custom_auth.models import Tenant
from users.models import Business, BusinessDetails, UserProfile

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('tenant_schema_fix.log')
    ]
)
logger = logging.getLogger(__name__)

def get_all_tenant_schemas():
    """Get all tenant schemas from the database."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT schema_name FROM information_schema.schemata
            WHERE schema_name LIKE 'tenant_%'
        """)
        return [row[0] for row in cursor.fetchall()]

def get_tenant_by_schema(tenant_id: uuid.UUID:
    """Get tenant object by schema name."""
    try:
        return Tenant.objects.get(schema_name=schema_name)
    except Tenant.DoesNotExist:
        return None

def check_business_exists_in_schema(tenant_id: uuid.UUID:
    """Check if a business exists in the specified schema."""
    cursor.execute(f"""
        SET search_path TO "{schema_name}";
        SELECT EXISTS (
            SELECT 1 FROM business_business WHERE id = %s
        )
    """, [str(business_id)])
    return cursor.fetchone()[0]

def get_business_from_public(business_id):
    """Get business record from public schema."""
    try:
        return Business.objects.get(id=business_id)
    except Business.DoesNotExist:
        return None

def get_business_details_from_public(business_id):
    """Get business details record from public schema."""
    try:
        return BusinessDetails.objects.get(business_id=business_id)
    except BusinessDetails.DoesNotExist:
        return None

def copy_business_to_tenant_schema(tenant_id: uuid.UUID:
    """Copy business record from public schema to tenant schema."""
    # Format the business fields for SQL insertion
    business_id = str(business.id)
    business_name = business.name
    business_num = business.business_num or ''
    created_at = business.created_at.isoformat() if business.created_at else timezone.now().isoformat()
    updated_at = business.updated_at.isoformat() if business.updated_at else timezone.now().isoformat()
    
    # Insert business record into tenant schema
    cursor.execute(f"""
        SET search_path TO "{schema_name}";
        INSERT INTO business_business (id, name, business_num, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            business_num = EXCLUDED.business_num,
            updated_at = EXCLUDED.updated_at
    """, [business_id, business_name, business_num, created_at, updated_at])
    
    # Get business details
    business_details = get_business_details_from_public(business_id)
    if business_details:
        # Insert business details record into tenant schema
        cursor.execute(f"""
            SET search_path TO "{schema_name}";
            INSERT INTO business_business_details (
                business_id, business_type, legal_structure, country, date_founded
            )
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (business_id) DO UPDATE
            SET business_type = EXCLUDED.business_type,
                legal_structure = EXCLUDED.legal_structure,
                country = EXCLUDED.country,
                date_founded = EXCLUDED.date_founded
        """, [
            business_id,
            business_details.business_type or 'default',
            business_details.legal_structure or 'SOLE_PROPRIETORSHIP',
            str(business_details.country) or 'US',
            business_details.date_founded.isoformat() if business_details.date_founded else None
        ])
    
    return True

def fix_userprofile_updated_at(tenant_id: uuid.UUID:
    """Fix UserProfile records with null updated_at values."""
    now = timezone.now().isoformat()
    
    # Check if updated_at column exists in users_userprofile table
    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = %s
            AND table_name = 'users_userprofile'
            AND column_name = 'updated_at'
        )
    """, [schema_name])
    
    if not cursor.fetchone()[0]:
        logger.info(f"No updated_at column in users_userprofile table in schema {schema_name}, skipping")
        return
    
    # Find UserProfiles with null updated_at values
    cursor.execute(f"""
        SELECT id, user_id
        FROM users_userprofile
        WHERE updated_at IS NULL
    """)
    profiles_to_fix = cursor.fetchall()
    
    if not profiles_to_fix:
        logger.info(f"No UserProfiles with null updated_at found in schema {schema_name}")
        return
    
    logger.info(f"Found {len(profiles_to_fix)} UserProfiles with null updated_at in schema {schema_name}")
    
    # Update each profile with null updated_at
    for profile_id, user_id in profiles_to_fix:
        cursor.execute(f"""
            UPDATE users_userprofile
            SET updated_at = %s
            WHERE id = %s
        """, [now, profile_id])
        
        logger.info(f"Fixed updated_at for UserProfile {profile_id} in schema {schema_name}")
    
    return True

def fix_tenant_schema_constraints():
    """Main function to fix tenant schema constraints."""
    logger.info("Starting tenant schema constraint fix")
    
    # Get all tenant schemas
    tenant_schemas = get_all_tenant_schemas()
    logger.info(f"Found {len(tenant_schemas)} tenant schemas")
    
    # Process each tenant schema
    for schema_name in tenant_schemas:
        logger.info(f"Processing schema: {schema_name}")
        
        # Get tenant object
        tenant = get_tenant_by_schema(schema_name)
        if not tenant:
            logger.warning(f"No tenant found for schema {schema_name}, skipping")
            continue
        
        # Create a new connection with autocommit=True to avoid transaction issues
        with connection.cursor() as cursor:
            try:
                # Use tenant_schema_context to ensure we're in the right schema
                with tenant_schema_context(cursor, schema_name):
                    # Check if users_userprofile table exists
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.tables
                            WHERE table_schema = %s AND table_name = 'users_userprofile'
                        )
                    """, [schema_name])
                    if not cursor.fetchone()[0]:
                        logger.warning(f"users_userprofile table doesn't exist in schema {schema_name}, skipping")
                        continue
                    
                    # Fix UserProfiles with null updated_at values
                    fix_userprofile_updated_at(cursor, schema_name)
                    
                    # Find UserProfiles with business_id that doesn't exist in this schema
                    cursor.execute(f"""
                        SELECT up.id, up.business_id, up.user_id
                        FROM users_userprofile up
                        LEFT JOIN business_business bb ON up.business_id = bb.id
                        WHERE up.business_id IS NOT NULL AND bb.id IS NULL
                    """)
                    invalid_profiles = cursor.fetchall()
                    
                    if not invalid_profiles:
                        logger.info(f"No invalid UserProfiles found in schema {schema_name}")
                        continue
                    
                    logger.info(f"Found {len(invalid_profiles)} invalid UserProfiles in schema {schema_name}")
                    
                    # Process each invalid profile
                    for profile_id, business_id, user_id in invalid_profiles:
                        if not business_id:
                            continue
                        
                        logger.info(f"Processing UserProfile {profile_id} with business_id {business_id}")
                        
                        # Get business from public schema
                        business = get_business_from_public(business_id)

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context
                        if not business:
                            logger.warning(f"Business {business_id} not found in public schema, skipping")
                            continue
                        
                        # Copy business to tenant schema
                        success = copy_business_to_tenant_schema(cursor, schema_name, business)
                        if success:
                            logger.info(f"Successfully copied Business {business_id} to schema {schema_name}")
                        else:
                            logger.error(f"Failed to copy Business {business_id} to schema {schema_name}")
            
            except Exception as e:
                logger.error(f"Error processing schema {schema_name}: {str(e)}")
                continue
    
    logger.info("Tenant schema constraint fix completed")

if __name__ == "__main__":
    fix_tenant_schema_constraints()
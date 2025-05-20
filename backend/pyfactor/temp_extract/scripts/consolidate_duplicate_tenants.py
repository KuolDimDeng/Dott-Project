#!/usr/bin/env python
"""
Script to find and consolidate duplicate tenant schemas.
This script will:
1. Find all tenant schemas in the database
2. Group them by owner
3. For each owner with multiple schemas, consolidate them by keeping the oldest one
4. Update all records to use the oldest schema

Usage:
    python manage.py shell < scripts/consolidate_duplicate_tenants.py
"""

import os
import sys
import django
import logging
import uuid
from datetime import datetime
from collections import defaultdict

# Set up Django environment
if __name__ == "__main__":
    # Add the parent directory to sys.path
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Set up Django settings
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
    django.setup()

# Now we can import Django models
from django.db import connection, transaction
from django.db.models import Count, Q
from custom_auth.models import User, Tenant
from custom_auth.utils import consolidate_user_tenants

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def get_all_tenant_schemas():
    """Get all tenant schemas from the database"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name LIKE 'tenant_%'
            ORDER BY schema_name
        """)
        return [row[0] for row in cursor.fetchall()]

def get_schema_creation_time(tenant_id: uuid.UUID:
    """Try to determine when a schema was created"""
    try:
        with connection.cursor() as cursor:
            # Set search path to the schema
            # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id)')
            
            # Try to get earliest migration time
            cursor.execute("""
                SELECT MIN(applied) 
                FROM django_migrations
                WHERE applied IS NOT NULL
            """)
            result = cursor.fetchone()
            if result and result[0]:
                return result[0]
            
            # If migrations table doesn't exist or has no data, try other tables
            tables_to_check = ['users_userprofile', 'business_business', 'inventory_product']
            for table in tables_to_check:
                try:
                    cursor.execute(f"""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.tables
                            WHERE table_schema = '{schema_name}'
                            AND table_name = '{table}'
                        )
                    """)
                    if cursor.fetchone()[0]:
                        cursor.execute(f"""
                            SELECT MIN(created_at) 
                            FROM /* RLS: Use tenant_id filtering */ "{table}"
                            WHERE created_at IS NOT NULL
                        """)
                        result = cursor.fetchone()
                        if result and result[0]:
                            return result[0]
                except Exception as e:
                    logger.debug(f"Error checking {table} in {schema_name}: {str(e)}")
            
            # Last resort: use the schema record creation time
            tenant = Tenant.objects.filter(schema_name=schema_name).first()
            if tenant and tenant.created_on:
                return tenant.created_on
    except Exception as e:
        logger.error(f"Error getting creation time for {schema_name}: {str(e)}")
    
    # Default to current time if we can't determine
    return datetime.now()

def find_owner_for_schema(tenant_id: uuid.UUID:
    """Find the owner for a given schema"""
    # First check Tenant record
    tenant = Tenant.objects.filter(schema_name=schema_name).first()
    if tenant and tenant.owner:
        return tenant.owner
    
    # If no tenant record or no owner, try to find a user with this tenant
    user = User.objects.filter(
        Q(tenant__schema_name=schema_name) | 
        Q(owned_tenants__schema_name=schema_name)
    ).first()
    
    return user

def consolidate_schemas(schema_to_keep, schemas_to_merge, owner=None):
    """
    Consolidate multiple schemas into one
    
    Args:
        schema_to_keep: The schema to keep
        schemas_to_merge: List of schemas to merge into schema_to_keep
        owner: The owner of the schemas (optional)
    """
    if not schemas_to_merge:
        return
    
    logger.info(f"Consolidating schemas: {', '.join(schemas_to_merge)} into {schema_to_keep}")
    
    # First, check if the tenant records exist
    tenant_to_keep = Tenant.objects.filter(schema_name=schema_to_keep).first()
    if not tenant_to_keep:
        logger.error(f"Tenant record for {schema_to_keep} not found")
        return
    
    # Update or create tenants for schemas to merge
    for schema in schemas_to_merge:
        tenant_to_merge = Tenant.objects.filter(schema_name=schema).first()
        
        if tenant_to_merge:
            # Mark as inactive and update name
            tenant_to_merge.is_active = False
            tenant_to_merge.name = f"{tenant_to_merge.name} (Consolidated into {schema_to_keep})"
            tenant_to_merge.save()
            
            # Update any users linked to this tenant
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE custom_auth_user
                    SET tenant_id = %s
                    WHERE tenant_id = %s
                """, [str(tenant_to_keep.id), str(tenant_to_merge.id)])
                
                logger.info(f"Updated {cursor.rowcount} users from tenant {schema} to {schema_to_keep}")

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context
        else:
            logger.warning(f"No tenant record found for schema {schema}")
    
    # If owner is provided, make sure they're linked to the correct tenant
    if owner:
        owner.tenant = tenant_to_keep
        owner.save(update_fields=['tenant'])
        logger.info(f"Updated owner {owner.email} to use tenant {schema_to_keep}")

def main():
    logger.info("Starting duplicate tenant schema consolidation")
    
    # Get all tenant schemas
    schemas = get_all_tenant_schemas()
    logger.info(f"Found {len(schemas)} tenant schemas")
    
    # Group schemas by owner
    owner_schemas = defaultdict(list)
    
    for schema in schemas:
        owner = find_owner_for_schema(schema)
        if owner:
            owner_schemas[owner.id].append((schema, get_schema_creation_time(schema)))
        else:
            logger.warning(f"No owner found for schema {schema}")
    
    # Find owners with multiple schemas
    owners_with_duplicates = {
        owner_id: schemas 
        for owner_id, schemas in owner_schemas.items() 
        if len(schemas) > 1
    }
    
    logger.info(f"Found {len(owners_with_duplicates)} users with multiple schemas")
    
    # Process each owner
    for owner_id, schema_list in owners_with_duplicates.items():
        try:
            owner = User.objects.get(id=owner_id)
            logger.info(f"Processing user {owner.email} with {len(schema_list)} schemas")
            
            # Sort schemas by creation time (oldest first)
            sorted_schemas = sorted(schema_list, key=lambda x: x[1])
            
            # Keep the oldest schema, consolidate the rest
            schema_to_keep = sorted_schemas[0][0]
            schemas_to_merge = [s[0] for s in sorted_schemas[1:]]
            
            logger.info(f"User {owner.email} - keeping {schema_to_keep}, merging {', '.join(schemas_to_merge)}")
            
            # Consolidate the schemas
            consolidate_schemas(schema_to_keep, schemas_to_merge, owner)
            
            # Use the utility function to update all references
            consolidated_tenant = consolidate_user_tenants(owner)
            if consolidated_tenant:
                logger.info(f"Successfully consolidated tenants for {owner.email}, primary tenant: {consolidated_ tenant.id}")
            else:
                logger.error(f"Failed to consolidate tenants for {owner.email}")
                
        except Exception as e:
            logger.error(f"Error processing owner {owner_id}: {str(e)}")
    
    logger.info("Tenant schema consolidation complete")

if __name__ == "__main__":
    main() 
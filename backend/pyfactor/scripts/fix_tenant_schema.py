#!/usr/bin/env python
"""
Fix a specific tenant schema by ensuring all required auth tables exist
Usage:
    python manage.py shell < scripts/fix_tenant_schema.py
"""

import os
import sys
import django
import logging
import uuid
from django.db import connection, transaction

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Specific tenant ID to fix - CHANGE THIS TO YOUR TENANT ID
TENANT_ID = 'b7fee399-ffca-4151-b636-94ccb65b3cd0'
SCHEMA_NAME = f"tenant_{TENANT_ID.replace('-', '_')}"

def fix_tenant_schema(tenant_id: uuid.UUID:
    """Fix a specific tenant schema by copying essential auth tables from public"""
    logger.info(f"Fixing tenant schema: {schema_name}")

    # Verify the schema exists
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.schemata 
                WHERE schema_name = %s
            )
        """, [schema_name])
        
        schema_exists = cursor.fetchone()[0]
        if not schema_exists:
            logger.error(f"Schema {schema_name} does not exist!")
            return False
        
        logger.info(f"Schema {schema_name} exists, checking tables...")
        
        # Check if custom_auth_user table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = %s AND table_name = 'custom_auth_user'
            )
        """, [schema_name])
        
        table_exists = cursor.fetchone()[0]
        if table_exists:
            logger.info(f"custom_auth_user table already exists in {schema_name}")
        else:
            logger.info(f"custom_auth_user table does NOT exist in {schema_name}, creating it")
            
            # Create the auth tables in tenant schema
            cursor.execute(f"""
                -- Create auth tables
                CREATE TABLE IF NOT EXISTS /* RLS: Use tenant_id filtering */ "custom_auth_user" (
                    id UUID PRIMARY KEY,
                    password VARCHAR(128) NOT NULL,
                    last_login TIMESTAMP WITH TIME ZONE NULL,
                    is_superuser BOOLEAN NOT NULL,
                    email VARCHAR(254) NOT NULL UNIQUE,
                    first_name VARCHAR(100) NOT NULL DEFAULT '',
                    last_name VARCHAR(100) NOT NULL DEFAULT '',
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
                    date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
                    confirmation_token UUID NOT NULL DEFAULT gen_random_uuid(),
                    is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
                    stripe_customer_id VARCHAR(255) NULL,
                    role VARCHAR(20) NOT NULL DEFAULT 'OWNER',
                    occupation VARCHAR(50) NOT NULL DEFAULT 'OWNER',
                    tenant_id UUID NULL,
                    cognito_sub VARCHAR(36) NULL
                );
                
                CREATE INDEX IF NOT EXISTS custom_auth_user_email_key ON "{schema_name}"."custom_auth_user" (email);
                CREATE INDEX IF NOT EXISTS idx_user_tenant ON /* RLS: Use tenant_id filtering */ "custom_auth_user" (tenant_id);
                
                -- Auth User Permissions
                CREATE TABLE IF NOT EXISTS "{schema_name}"."custom_auth_user_user_permissions" (
                    id SERIAL PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES /* RLS: Use tenant_id filtering */ "custom_auth_user"(id),
                    permission_id INTEGER NOT NULL,
                    CONSTRAINT custom_auth_user_user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id)
                );
                
                -- Auth User Groups
                CREATE TABLE IF NOT EXISTS "{schema_name}"."custom_auth_user_groups" (
                    id SERIAL PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES /* RLS: Use tenant_id filtering */ "custom_auth_user"(id),
                    group_id INTEGER NOT NULL,
                    CONSTRAINT custom_auth_user_groups_user_id_group_id_key UNIQUE (user_id, group_id)
                );
                
                -- Tenant table
                CREATE TABLE IF NOT EXISTS "{schema_name}"."custom_auth_tenant" (
                    id UUID PRIMARY KEY,
                    schema_name VARCHAR(63) NOT NULL UNIQUE,
                    name VARCHAR(100) NOT NULL,
                    created_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    setup_status VARCHAR(20) NOT NULL,
                    setup_task_id VARCHAR(255) NULL,
                    last_setup_attempt TIMESTAMP WITH TIME ZONE NULL,
                    setup_error_message TEXT NULL,
                    last_health_check TIMESTAMP WITH TIME ZONE NULL,
                    storage_quota_bytes BIGINT NOT NULL DEFAULT 2147483648,
                    owner_id UUID NOT NULL REFERENCES /* RLS: Use tenant_id filtering */ "custom_auth_user"(id)
                );
            """)
            
            logger.info(f"Successfully created auth tables in {schema_name}")
            
            # Now we need to copy user data from public to tenant schema
            # First get tenant owner
            cursor.execute("""
                SELECT owner_id FROM custom_auth_tenant WHERE schema_name = %s
            """, [schema_name])
            
            owner_id = cursor.fetchone()
            if owner_id:
                owner_id = owner_id[0]
                logger.info(f"Found owner ID: {owner_id} for schema {schema_name}")
                
                # Get user data
                cursor.execute("""
                    SELECT id, password, last_login, is_superuser, email, first_name, last_name, 
                           is_active, is_staff, date_joined, email_confirmed, confirmation_token, 
                           is_onboarded, stripe_customer_id, role, occupation, tenant_id, cognito_sub
                    FROM custom_auth_user
                    WHERE id = %s
                """, [owner_id])
                
                user_data = cursor.fetchone()
                if user_data:
                    logger.info(f"Found user data for {user_data[4]}, copying to tenant schema")
                    
                    # Copy user to tenant schema
                    cursor.execute(f"""
                        INSERT INTO /* RLS: Use tenant_id filtering */ "custom_auth_user" 
                        (id, password, last_login, is_superuser, email, first_name, last_name, 
                         is_active, is_staff, date_joined, email_confirmed, confirmation_token, 
                         is_onboarded, stripe_customer_id, role, occupation, tenant_id, cognito_sub)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, user_data)
                    
                    logger.info(f"Successfully copied user data to {schema_name}")
                else:
                    logger.error(f"No user data found for owner ID: {owner_id}")
            else:
                logger.error(f"No owner found for schema {schema_name}")
                
            # Get tenant data
            cursor.execute("""
                SELECT id, schema_name, name, created_on, is_active, setup_status, 
                       setup_task_id, last_setup_attempt, setup_error_message,
                       last_health_check, storage_quota_bytes, owner_id
                FROM custom_auth_tenant
                WHERE schema_name = %s
            """, [schema_name])
            
            tenant_data = cursor.fetchone()
            if tenant_data:
                logger.info(f"Found tenant data for {tenant_data[1]}, copying to tenant schema")
                
                # Copy tenant to tenant schema
                cursor.execute(f"""
                    INSERT INTO /* RLS: Use tenant_id filtering */ "custom_auth_tenant"
                    (id, schema_name, name, created_on, is_active, setup_status, 
                     setup_task_id, last_setup_attempt, setup_error_message,
                     last_health_check, storage_quota_bytes, owner_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, tenant_data)
                
                logger.info(f"Successfully copied tenant data to {schema_name}")
            else:
                logger.error(f"No tenant data found for schema {schema_name}")
        
        # Verify all auth tables exist now
        cursor.execute(f"""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = %s AND table_name LIKE 'custom_auth_%'
        """, [schema_name])
        
        tables = [row[0] for row in cursor.fetchall()]
        logger.info(f"Auth tables in {schema_name}: {', '.join(tables)}")
        
        return True

if __name__ == "__main__":
    # Run the fix
    logger.info(f"Starting schema fix for tenant {TENANT_ID} (schema: {SCHEMA_NAME})")
    success = fix_tenant_schema(SCHEMA_NAME)
    if success:
        logger.info(f"Successfully fixed schema {SCHEMA_NAME}")
    else:
        logger.error(f"Failed to fix schema {SCHEMA_NAME}")

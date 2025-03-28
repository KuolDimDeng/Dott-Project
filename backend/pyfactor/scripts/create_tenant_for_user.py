#!/usr/bin/env python
"""
Create a tenant schema for a specific user
Usage:
    python manage.py shell < scripts/create_tenant_for_user.py
"""

import os
import sys
import django
import logging
import uuid
import time
from django.db import connection, transaction
from django.utils import timezone
from custom_auth.models import User, Tenant

# Set up logging to console
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# User email to create tenant for
USER_EMAIL = 'kuoldimdeng@outlook.com'

def create_tenant_for_user(user_email):
    """Create a tenant schema for a specific user"""
    print(f"Creating tenant schema for user: {user_email}")
    
    try:
        # Get the user
        user = User.objects.get(email=user_email)
        print(f"Found user: {user.email} (ID: {user.id})")
        
        # Check if user already has a tenant
        tenant = Tenant.objects.filter(owner_id=user.id).first()
        if tenant:
            print(f"User already has tenant: {tenant.schema_name}")
            return tenant
        
        # Generate schema name and tenant name
        tenant_id = uuid.uuid4()
        schema_name = f"tenant_{str(tenant_id).replace('-', '_')}"
        tenant_name = f"{user.first_name}'s Business"
        
        print(f"Generated tenant ID: {tenant_id}")
        print(f"Generated schema name: {schema_name}")
        
        # Create tenant record
        with transaction.atomic():
            tenant = Tenant.objects.create(
                id=tenant_id,
                schema_name=schema_name,
                name=tenant_name,
                owner_id=user.id,
                created_on=timezone.now(),
                is_active=True,
                setup_status='pending'
            )
            print(f"Created tenant record with ID: {tenant.id}")
            
            # Link tenant to user
            user.tenant_id = tenant.id
            user.save(update_fields=['tenant_id'])
            print(f"Linked tenant {tenant.schema_name} to user {user.email}")
            
            # Create schema in database
            with connection.cursor() as cursor:
                # Create schema
                print(f"Creating schema: {schema_name}")
                cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                
                # Verify schema was created
                cursor.execute("""
                    SELECT schema_name FROM information_schema.schemata
                    WHERE schema_name = %s
                """, [schema_name])
                schema_exists = cursor.fetchone() is not None
                print(f"Schema creation verified: {schema_exists}")
                
                # Set up permissions
                db_user = connection.settings_dict['USER']
                print(f"Setting up permissions for user {db_user}")
                cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
                cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
                cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
                
                # Create essential auth tables in the new schema
                print(f"Creating essential auth tables in schema {schema_name}")
                cursor.execute(f"""
                    -- Create auth tables
                    CREATE TABLE IF NOT EXISTS "{schema_name}"."custom_auth_user" (
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
                    CREATE INDEX IF NOT EXISTS idx_user_tenant ON "{schema_name}"."custom_auth_user" (tenant_id);
                    
                    -- Auth User Permissions
                    CREATE TABLE IF NOT EXISTS "{schema_name}"."custom_auth_user_user_permissions" (
                        id SERIAL PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES "{schema_name}"."custom_auth_user"(id),
                        permission_id INTEGER NOT NULL,
                        CONSTRAINT custom_auth_user_user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id)
                    );
                    
                    -- Auth User Groups
                    CREATE TABLE IF NOT EXISTS "{schema_name}"."custom_auth_user_groups" (
                        id SERIAL PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES "{schema_name}"."custom_auth_user"(id),
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
                        owner_id UUID NOT NULL
                    );
                """)
                
                # Copy the user to the new schema
                cursor.execute(f"""
                    INSERT INTO "{schema_name}"."custom_auth_user" 
                    (id, password, last_login, is_superuser, email, first_name, last_name, 
                    is_active, is_staff, date_joined, email_confirmed, confirmation_token, 
                    is_onboarded, stripe_customer_id, role, occupation, tenant_id, cognito_sub)
                    VALUES (
                        %s, %s, %s, %s, %s, %s, %s, 
                        %s, %s, %s, %s, %s, 
                        %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (id) DO NOTHING
                """, [
                    str(user.id), user.password, user.last_login, user.is_superuser,
                    user.email, user.first_name, user.last_name,
                    user.is_active, user.is_staff, user.date_joined, user.email_confirmed,
                    str(user.confirmation_token) if user.confirmation_token else str(uuid.uuid4()),
                    user.is_onboarded, user.stripe_customer_id, user.role, user.occupation,
                    str(tenant.id), user.cognito_sub
                ])
                
                # Copy the tenant to the new schema
                cursor.execute(f"""
                    INSERT INTO "{schema_name}"."custom_auth_tenant"
                    (id, schema_name, name, created_on, is_active, setup_status, 
                    setup_task_id, last_setup_attempt, setup_error_message,
                    last_health_check, storage_quota_bytes, owner_id)
                    VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s
                    )
                    ON CONFLICT (id) DO NOTHING
                """, [
                    str(tenant.id), tenant.schema_name, tenant.name, tenant.created_on,
                    tenant.is_active, tenant.setup_status,
                    tenant.setup_task_id, tenant.last_setup_attempt, tenant.setup_error_message,
                    tenant.last_health_check, tenant.storage_quota_bytes, str(user.id)
                ])
                
                print(f"Successfully copied user and tenant to schema {schema_name}")
                
                # Verify auth tables were created
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = %s AND table_name = 'custom_auth_user'
                    )
                """, [schema_name])
                auth_table_exists = cursor.fetchone()[0]
                print(f"Auth table exists in schema {schema_name}: {auth_table_exists}")
                
        print(f"Tenant schema setup completed successfully for user {user_email}")
        return tenant
            
    except User.DoesNotExist:
        print(f"User with email {user_email} does not exist")
        return None
    except Exception as e:
        print(f"Error creating tenant: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

# Run the creation script
print("Starting tenant creation script")
tenant = create_tenant_for_user(USER_EMAIL)
if tenant:
    print(f"Successfully created tenant {tenant.schema_name} (ID: {tenant.id})")
else:
    print("Failed to create tenant") 
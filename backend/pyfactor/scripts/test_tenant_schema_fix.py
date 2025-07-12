#!/usr/bin/env python
"""
Test script to verify the tenant schema foreign key constraint fix.

This script:
1. Creates a test tenant schema
2. Creates a test business in the tenant schema
3. Creates a test user profile in the tenant schema that references the business
4. Verifies that the foreign key constraint is satisfied

Usage:
    python manage.py shell < scripts/test_tenant_schema_fix.py
"""

import uuid
import logging
from django.db import connection
from django.utils import timezone
from onboarding.utils import tenant_schema_context
from custom_auth.models import Tenant, User
from users.models import Business, BusinessDetails, UserProfile

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

def create_test_tenant():
    """Create a test tenant for verification."""
    # Generate a unique tenant ID and schema name
    tenant_id = uuid.uuid4()
    schema_name = f/* RLS: Use tenant_id filtering */ replace('-', '_')
    
    # Create test user
    test_user = User.objects.create(
        email=f"test_{tenant_id}@example.com",
        first_name="Test",
        last_name="User"
    )
    
    # Create tenant
    tenant = Tenant.objects.create(
        id=tenant_id,
        name=f"Test Tenant {tenant_id}",
        schema_name=schema_name,
        owner=test_user,
        database_status='active',
        setup_status='complete'
    )
    
    # Create schema
    with connection.cursor() as cursor:
        cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
        
        # Create business_business table
        cursor.execute(f"""
            SET search_path TO "{schema_name}";
            CREATE TABLE IF NOT EXISTS business_business (
                id uuid PRIMARY KEY,
                name varchar(255) NOT NULL,
                business_num varchar(6) UNIQUE,
                created_at timestamp with time zone DEFAULT NOW(),
                updated_at timestamp with time zone DEFAULT NOW()
            )
        """)
        
        # Create business_business_details table
        cursor.execute(f"""
            SET search_path TO "{schema_name}";
            CREATE TABLE IF NOT EXISTS business_business_details (
                business_id uuid PRIMARY KEY REFERENCES business_business(id),
                business_type varchar(50),
                legal_structure varchar(50) DEFAULT 'SOLE_PROPRIETORSHIP',
                country varchar(2) DEFAULT 'US',
                date_founded date NULL
            )
        """)
        
        # Create users_userprofile table
        cursor.execute(f"""
            SET search_path TO "{schema_name}";
            CREATE TABLE IF NOT EXISTS users_userprofile (
                id serial PRIMARY KEY,
                user_id uuid NOT NULL UNIQUE,
                business_id uuid REFERENCES business_business(id),
                is_business_owner boolean DEFAULT false,
                created_at timestamp with time zone DEFAULT NOW(),
                modified_at timestamp with time zone DEFAULT NOW(),
                updated_at timestamp with time zone DEFAULT NOW() NOT NULL
            )
        """)
    
    return tenant, test_user

def test_business_creation_in_tenant_schema():
    """Test business creation in tenant schema."""
    logger.info("Starting tenant schema constraint test")
    
    # Create test tenant and user
    tenant, test_user = create_test_tenant()
    schema_name =  tenant.id
    logger.info(f"Created test tenant with schema: {schema_name}")
    
    # Create a new connection with autocommit=True
    with connection.cursor() as cursor:
        try:
            # Use tenant_schema_context to ensure we're in the right schema
            with tenant_schema_context(cursor, schema_name):
                # Create business in tenant schema
                business_id = uuid.uuid4()
                business_name = f"Test Business {business_id}"
                business_num = ''.join([str(random.randint(0, 9)) for _ in range(6)])
                
                cursor.execute(f"""
                    INSERT INTO business_business (id, name, business_num, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, [
                    str(business_id),
                    business_name,
                    business_num,
                    timezone.now(),
                    timezone.now()
                ])
                
                # Create business details
                cursor.execute(f"""
                    INSERT INTO business_business_details (business_id, business_type, legal_structure, country)
                    VALUES (%s, %s, %s, %s)
                """, [
                    str(business_id),
                    'default',
                    'SOLE_PROPRIETORSHIP',
                    'US'
                ])
                
                # Create user profile that references the business
                now = timezone.now()
                cursor.execute(f"""
                    INSERT INTO users_userprofile (
                        user_id, 
                        business_id, 
                        is_business_owner, 
                        created_at, 
                        modified_at, 
                        updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, [
                    str(test_user.id),
                    str(business_id),
                    True,
                    now,
                    now,
                    now
                ])
                
                # Verify the records were created
                cursor.execute(f"""
                    SELECT COUNT(*) FROM business_business WHERE id = %s
                """, [str(business_id)])
                business_count = cursor.fetchone()[0]
                
                cursor.execute(f"""
                    SELECT COUNT(*) FROM users_userprofile WHERE business_id = %s
                """, [str(business_id)])
                profile_count = cursor.fetchone()[0]
                
                if business_count == 1 and profile_count == 1:
                    logger.info("✅ TEST PASSED: Successfully created business and user profile in tenant schema")
                else:
                    logger.error(f"❌ TEST FAILED: Records not created correctly. Business count: {business_count}, Profile count: {profile_count}")
                
        except Exception as e:
            logger.error(f"❌ TEST FAILED: Error during test: {str(e)}")
        finally:
            # Clean up - drop the test schema
            cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
            # Delete the test tenant and user
            tenant.delete()
            test_user.delete()
            logger.info("Test cleanup completed")

if __name__ == "__main__":
    import random  # Import here for business_num generation

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context
    test_business_creation_in_tenant_schema()
#!/usr/bin/env python
"""
Create a tenant for a specific user with RLS isolation
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
    """Create a tenant with RLS for a specific user"""
    print(f"Creating tenant for user: {user_email}")
    
    try:
        # Get the user
        user = User.objects.get(email=user_email)
        print(f"Found user: {user.email} (ID: {user.id})")
        
        # Check if user already has a tenant
        tenant = Tenant.objects.filter(owner_id=user.id).first()
        if tenant:
            print(f"User already has tenant: {tenant.id}")
            return tenant
        
        # Generate tenant ID and name
        tenant_id = uuid.uuid4()
        tenant_name = f"{user.first_name}'s Business"
        
        print(f"Generated tenant ID: {tenant_id}")
        
        # Create tenant record
        with transaction.atomic():
            # Create tenant with RLS enabled
            tenant = Tenant.objects.create(
                id=tenant_id,
                name=tenant_name,
                owner_id=user.id,
                created_on=timezone.now(),
                is_active=True,
                setup_status='pending',
                rls_enabled=True,
                rls_setup_date=timezone.now()
            )
            print(f"Created tenant record with ID: {tenant.id}")
            
            # Link tenant to user
            user.tenant_id = tenant.id
            user.save(update_fields=['tenant_id'])
            print(f"Linked tenant {tenant.id} to user {user.email}")
            
            # Set up RLS for this tenant
            with connection.cursor() as cursor:
                # Set the app.current_tenant_id parameter for the session
                cursor.execute("SET app.current_tenant_id = %s", [str(tenant.id)])
                print(f"Set current tenant context to {tenant.id}")
                
                # Apply RLS policies to tenant-aware tables
                tenant_tables = [
                    'banking_bankaccount',
                    'banking_banktransaction', 
                    'banking_plaiditem',
                    'banking_tinkitem',
                    'finance_account',
                    'finance_accountreconciliation',
                    'finance_transaction',
                    'inventory_product',
                    'inventory_inventoryitem',
                    'sales_invoice',
                    'sales_sale',
                    'purchases_bill',
                    'purchases_vendor',
                    'crm_customer',
                    'crm_lead',
                ]
                
                for table in tenant_tables:
                    # Check if table exists
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.tables 
                            WHERE table_schema = 'public' AND table_name = %s
                        )
                    """, [table])
                    
                    if cursor.fetchone()[0]:
                        try:
                            # Enable RLS on the table
                            cursor.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')
                            
                            # Create tenant isolation policy
                            cursor.execute(f"""
                                DROP POLICY IF EXISTS tenant_isolation_policy ON {table};
                                CREATE POLICY tenant_isolation_policy ON {table}
                                    USING (
                                        tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset')::uuid
                                        AND current_setting('app.current_tenant_id', TRUE) != 'unset'
                    );
                """)
                            print(f"Applied RLS policy to table: {table}")
                        except Exception as e:
                            print(f"Error applying RLS to {table}: {str(e)}")
                
                print(f"Successfully set up RLS for tenant {tenant.id}")
                
        print(f"Tenant setup completed successfully for user {user_email}")
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
    print(f"Successfully created tenant {tenant.id} for user {USER_EMAIL}")
else:
    print("Failed to create tenant") 
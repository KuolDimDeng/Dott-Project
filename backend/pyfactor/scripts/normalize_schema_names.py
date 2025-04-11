# normalize_schema_names.py
import os
import sys
import re

# Add the project root directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)  # Go up one level from scripts directory
sys.path.insert(0, project_root)

# Setup Django
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Now import Django models
from django.db import transaction, connections
from custom_auth.models import User, Tenant

def normalize_schema_name(tenant_id: uuid.UUID:
    """Convert schema name to the proper format with underscores"""
    # Extract the tenant ID (everything after 'tenant_')
    match = re.match(r'^tenant_(.+)$', schema_name)
    if not match:
        return schema_name
    
    tenant_id = match.group(1)
    # Replace hyphens with underscores
    normalized_id = tenant_id.replace('-', '_')
    # Return properly formatted schema name
    return f"tenant_{normalized_id}"

def update_tenant_schema_names():
    """Update tenant records to use properly formatted schema names"""
    # Find all tenants with hyphens in their schema names
    tenants = Tenant.objects.all()
    updated_count = 0
    
    print(f"Found {tenants.count()} tenants to check")
    
    for tenant in tenants:
        try:
            old_schema_name =  tenant.id
            
            # Skip if schema name is already properly formatted
            if re.match(r'^tenant_[a-z0-9_]+$', old_schema_name):
                print(f"Tenant {tenant.id} schema name is already properly formatted: {old_schema_name}")
                continue
                
            # Generate properly formatted schema name
            new_schema_name = normalize_schema_name(old_schema_name)
            
            if old_schema_name == new_schema_name:
                print(f"No change needed for tenant {tenant.id}, schema: {old_schema_name}")
                continue
            
            print(f"Tenant {tenant.id} schema will be updated: {old_schema_name} -> {new_schema_name}")
            
            # Check if a schema with the new name already exists
            with connections['default'].cursor() as cursor:
                cursor.execute("""
                    SELECT 1 FROM information_schema.schemata
                    WHERE schema_name = %s
                """, [new_schema_name])
                if cursor.fetchone():
                    print(f"WARNING: Schema {new_schema_name} already exists!")
                    continue
            
            with transaction.atomic():
                # Create new schema with proper name
                with connections['default'].cursor() as cursor:
                    # Save original search path
                    cursor.execute('SHOW search_path')
                    original_search_path = cursor.fetchone()[0]
                    
                    # First create the new schema
                    cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{new_schema_name}"')
                    
                    # Copy data from old schema to new schema (if old schema exists)
                    cursor.execute("""
                        SELECT 1 FROM information_schema.schemata
                        WHERE schema_name = %s
                    """, [old_schema_name])
                    
                    if cursor.fetchone():
                        # Get list of tables in old schema
                        cursor.execute("""
                            SELECT table_name
                            FROM information_schema.tables
                            WHERE table_schema = %s AND table_type = 'BASE TABLE'
                        """, [old_schema_name])
                        
                        tables = cursor.fetchall()
                        
                        for table in tables:
                            table_name = table[0]
                            print(f"  Copying table {table_name} from {old_schema_name} to {new_schema_name}")
                            
                            # Create table in new schema
                            cursor.execute(f'CREATE TABLE IF NOT EXISTS /* RLS: Use tenant_id filtering */ "{table_name}" (LIKE "{old_schema_name}"."{table_name}" INCLUDING ALL)')
                            
                            # Copy data
                            cursor.execute(f'INSERT INTO /* RLS: Use tenant_id filtering */ "{table_name}" SELECT * FROM "{old_schema_name}"."{table_name}"')
                        
                        # Drop old schema
                        cursor.execute(f'DROP SCHEMA IF EXISTS "{old_schema_name}" CASCADE')
                    
                    # Restore original search path
                    cursor.execute(f'SET search_path TO {original_search_path}')
                
                # Update tenant record
                 tenant.id = new_schema_name
                tenant.save(update_fields=['schema_name'])
                updated_count += 1
                
                print(f"Successfully updated tenant {tenant.id} schema: {old_schema_name} -> {new_schema_name}")
        
        except Exception as e:
            print(f"Error updating tenant {tenant.id}: {str(e)}")
    
    print(f"Successfully updated {updated_count} tenant schema names")

def update_user_roles():
    """Update user roles from EMPLOYEE to OWNER for all users that have the OWNER role in Cognito"""
    # Get all users with role EMPLOYEE
    users = User.objects.filter(role='EMPLOYEE')
    
    updated_count = 0
    
    print(f"Found {users.count()} users with role 'EMPLOYEE'")
    
    for user in users:
        try:
            with transaction.atomic():
                if user.cognito_sub:
                    # Update the role to OWNER since Cognito has OWNER role
                    user.role = 'OWNER'
                    user.occupation = 'OWNER'
                    user.save(update_fields=['role', 'occupation'])
                    updated_count += 1
                    print(f"Updated user: {user.email} to role OWNER")
        except Exception as e:
            print(f"Error updating user {user.email}: {str(e)}")
    
    print(f"Updated {updated_count} users from EMPLOYEE to OWNER role")

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context

if __name__ == "__main__":
    print("Starting user role update...")
    update_user_roles()
    print("\nStarting schema name normalization...")
    update_tenant_schema_names()
    print("\nAll updates completed!")
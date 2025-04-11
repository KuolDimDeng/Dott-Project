#!/usr/bin/env python
"""
Tenant Deletion Script

This script deletes a tenant from the database, including its schema
and all related records. Use with caution!
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Color codes for terminal output
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"

# Get environment variables or use default values
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_NAME = os.environ.get("DB_NAME", "dott_main")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "postgres")

# Tenant ID to delete
TENANT_ID = "e53b800b-c4e1-5fd1-abc6-ba3a785c0102"

def establish_connection():
    """Connect to the database"""
    try:
        connection = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        return connection
    except Exception as e:
        print(f"{RED}Failed to connect to the database: {e}{RESET}")
        sys.exit(1)

def get_tenant_info(connection, tenant_id):
    """Get tenant information from the database"""
    cursor = connection.cursor()
    cursor.execute(
        "SELECT id, name, schema_name FROM custom_auth_tenant WHERE id = %s",
        (tenant_id,)
    )
    result = cursor.fetchone()
    cursor.close()
    return result

def delete_tenant(connection, tenant_id, schema_name):
    """Delete tenant and its schema"""
    cursor = connection.cursor()
    
    print(f"{YELLOW}Deleting tenant {tenant_id} with schema {schema_name}...{RESET}")
    
    try:
        # Delete tenant users associations
        print("Deleting tenant user associations...")
        cursor.execute(
            "DELETE FROM custom_auth_tenant_users WHERE tenant_id = %s",
            (tenant_id,)
        )
        
        # Delete tenant record
        print("Deleting tenant record...")
        cursor.execute(
            "DELETE FROM custom_auth_tenant WHERE id = %s",
            (tenant_id,)
        )
        
        # Drop tenant schema if it exists
        print(f"Dropping schema {schema_name}...")
        cursor.execute(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE")
        
        print(f"{GREEN}Successfully deleted tenant {tenant_id} and schema {schema_name}{RESET}")
        return True
    except Exception as e:
        print(f"{RED}Error deleting tenant: {e}{RESET}")
        return False
    finally:
        cursor.close()

def main():
    """Main function"""
    print(f"{YELLOW}Starting tenant deletion process...{RESET}")
    
    # Connect to the database
    connection = establish_connection()
    
    # Get tenant information
    tenant_info = get_tenant_info(connection, TENANT_ID)
    if not tenant_info:
        print(f"{RED}Tenant with ID {TENANT_ID} not found in the database{RESET}")
        connection.close()
        sys.exit(1)
    
    tenant_id, tenant_name, schema_name = tenant_info
    
    # Confirm deletion
    print(f"\nAre you sure you want to delete the following tenant?")
    print(f"ID: {tenant_id}")
    print(f"Name: {tenant_name}")
    print(f"Schema: {schema_name}")
    print(f"\n{RED}WARNING: This action cannot be undone!{RESET}")
    
    confirmation = input(f"\nType '{tenant_name}' to confirm deletion: ")
    
    if confirmation != tenant_name:
        print(f"{YELLOW}Deletion cancelled.{RESET}")
        connection.close()
        sys.exit(0)
    
    # Delete tenant
    success = delete_tenant(connection, tenant_id, schema_name)
    
    # Close connection
    connection.close()
    
    if success:
        print(f"\n{GREEN}Tenant deletion completed successfully.{RESET}")
        print(f"{YELLOW}Next steps:{RESET}")
        print(f"1. Clear your browser cookies and localStorage")
        print(f"2. Restart your Next.js development server")
        print(f"3. Log in again to create a new tenant")
    else:
        print(f"\n{RED}Tenant deletion failed. Please check the errors above.{RESET}")

if __name__ == "__main__":
    main() 
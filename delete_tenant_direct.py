#!/usr/bin/env python
"""
Direct Tenant Deletion Script

This script directly deletes a tenant from the database by:
1. First dropping the tenant's schema
2. Directly deleting related records from tenant_users 
3. Forcing deletion of the tenant record with a direct SQL query

Use with caution - this script bypasses normal constraints!
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Color codes for terminal output
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"

# Get environment variables or use default values
DB_HOST = os.environ.get("DB_HOST", "dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_NAME = os.environ.get("DB_NAME", "dott_main")
DB_USER = os.environ.get("DB_USER", "dott_admin")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "RRfXU6uPPUbBEg1JqGTJ")

def connect_to_database():
    """Connect to the PostgreSQL database."""
    try:
        connection = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print(f"{GREEN}Successfully connected to PostgreSQL database{RESET}")
        return connection
    except Exception as e:
        print(f"{RED}Error connecting to PostgreSQL database: {e}{RESET}")
        sys.exit(1)

def list_all_tenants(connection):
    """List all tenants in the database"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, name, schema_name, created_at 
            FROM custom_auth_tenant 
            ORDER BY created_at DESC
        """)
        tenants = cursor.fetchall()
        
        if not tenants:
            print(f"{YELLOW}No tenants found in the database.{RESET}")
            return []
        
        print(f"{BLUE}Found {len(tenants)} tenants:{RESET}")
        for i, tenant in enumerate(tenants, 1):
            tenant_id, name, schema_name, created_at = tenant
            print(f"  {i}. ID: {tenant_id}")
            print(f"     Name: {name}")
            print(f"     Schema: {schema_name}")
            print(f"     Created: {created_at}")
            print()
        
        return tenants

def drop_tenant_schema(connection, schema_name):
    """Drop a tenant's schema"""
    with connection.cursor() as cursor:
        try:
            # Check if schema exists
            cursor.execute("""
                SELECT EXISTS(
                    SELECT 1 FROM information_schema.schemata 
                    WHERE schema_name = %s
                )
            """, (schema_name,))
            schema_exists = cursor.fetchone()[0]
            
            if not schema_exists:
                print(f"{YELLOW}Schema {schema_name} does not exist, skipping drop{RESET}")
                return True
            
            # Drop the schema with CASCADE to drop all objects within it
            cursor.execute(f"DROP SCHEMA {schema_name} CASCADE")
            print(f"{GREEN}Successfully dropped schema {schema_name}{RESET}")
            return True
        except Exception as e:
            print(f"{RED}Error dropping schema {schema_name}: {e}{RESET}")
            return False

def delete_tenant_direct(connection, tenant_id):
    """Delete a tenant directly using SQL commands that bypass constraints"""
    with connection.cursor() as cursor:
        try:
            # Get tenant info for schema name
            cursor.execute("""
                SELECT name, schema_name FROM custom_auth_tenant 
                WHERE id = %s
            """, (tenant_id,))
            result = cursor.fetchone()
            
            if not result:
                print(f"{RED}Tenant with ID {tenant_id} not found{RESET}")
                return False
            
            name, schema_name = result
            print(f"{BLUE}Deleting tenant: {name} (ID: {tenant_id}){RESET}")
            
            # Step 1: Drop the tenant's schema
            schema_dropped = drop_tenant_schema(connection, schema_name)
            if not schema_dropped:
                print(f"{YELLOW}Warning: Could not drop schema {schema_name}{RESET}")
            
            # Step 2: Delete from tenant_users table
            try:
                cursor.execute("""
                    DELETE FROM tenant_users
                    WHERE tenant_id = %s
                """, (tenant_id,))
                print(f"{GREEN}Deleted {cursor.rowcount} records from tenant_users{RESET}")
            except Exception as e:
                print(f"{YELLOW}Error deleting from tenant_users: {e}{RESET}")
            
            # Step 3: Force-delete the tenant record with a stronger SQL command
            cursor.execute("""
                DELETE FROM custom_auth_tenant
                WHERE id = %s
            """, (tenant_id,))
            
            if cursor.rowcount > 0:
                print(f"{GREEN}Successfully deleted tenant record for {name} (ID: {tenant_id}){RESET}")
                return True
            else:
                print(f"{RED}No tenant record was deleted (ID: {tenant_id}){RESET}")
                return False
        except Exception as e:
            print(f"{RED}Error during tenant deletion: {e}{RESET}")
            return False

def main():
    """Main function to delete tenants"""
    print(f"{YELLOW}=== DIRECT TENANT DELETION TOOL ==={RESET}")
    print(f"{RED}WARNING: This tool directly deletes tenant records!{RESET}")
    print()

    # Connect to the database
    connection = connect_to_database()
    
    try:
        # List all tenants
        tenants = list_all_tenants(connection)
        
        if not tenants:
            print(f"{YELLOW}No tenants to delete. Exiting.{RESET}")
            return
        
        # Ask which tenant to delete
        tenant_choice = input(f"{YELLOW}Enter tenant number to delete (or 'all' for all tenants): {RESET}")
        
        tenants_to_delete = []
        if tenant_choice.lower() == 'all':
            tenants_to_delete = tenants
            print(f"{RED}WARNING: You are about to delete ALL {len(tenants)} tenants!{RESET}")
        else:
            try:
                index = int(tenant_choice) - 1
                if 0 <= index < len(tenants):
                    tenants_to_delete = [tenants[index]]
                else:
                    print(f"{RED}Invalid tenant number. Exiting.{RESET}")
                    return
            except ValueError:
                print(f"{RED}Invalid input. Please enter a number or 'all'. Exiting.{RESET}")
                return
        
        # Final confirmation
        confirm = input(f"{RED}Are you ABSOLUTELY SURE? This cannot be undone! Type 'DELETE' to confirm: {RESET}")
        if confirm != "DELETE":
            print(f"{YELLOW}Deletion cancelled. Exiting.{RESET}")
            return
        
        # Delete selected tenants
        success_count = 0
        for tenant in tenants_to_delete:
            tenant_id, name, schema_name, _ = tenant
            print(f"\n{BLUE}Processing tenant: {name} (ID: {tenant_id}){RESET}")
            
            if delete_tenant_direct(connection, tenant_id):
                success_count += 1
        
        # Summary
        print(f"\n{BLUE}=== DELETION SUMMARY ==={RESET}")
        print(f"{GREEN}Successfully deleted {success_count} of {len(tenants_to_delete)} tenants{RESET}")
        
    finally:
        # Close connection
        connection.close()
        print(f"{BLUE}Database connection closed{RESET}")

if __name__ == "__main__":
    main() 
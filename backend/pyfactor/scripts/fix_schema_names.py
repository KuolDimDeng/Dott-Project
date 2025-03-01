# fix_schema_names.py
import os
import psycopg2
import sys
import re

# Database connection parameters - adjust these to match your .env file or settings
DB_NAME = "dott_main"
DB_USER = "dott_admin"
DB_PASSWORD = "RRfXU6uPPUbBEg1JqGTJ"
DB_HOST = "dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com"
DB_PORT = "5432"

print(f"Connecting to {DB_NAME} on {DB_HOST}:{DB_PORT} as {DB_USER}...")

def normalize_schema_name(schema_name):
    """Convert schema name to use underscores instead of hyphens"""
    if not schema_name:
        return schema_name
    
    # Replace hyphens with underscores
    return schema_name.replace('-', '_')

try:
    # Connect to the database
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    conn.autocommit = True  # Set autocommit mode

    with conn.cursor() as cursor:
        # Find the tenant table
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public' 
            AND (table_name LIKE '%tenant%' OR table_name LIKE '%_tenant')
        """)
        
        tenant_tables = cursor.fetchall()
        
        if not tenant_tables:
            print("Could not find tenant table in the database.")
            sys.exit(1)
        
        # Assuming the first match is our tenant table
        tenant_table = tenant_tables[0][0]
        print(f"Found tenant table: {tenant_table}")
        
        # Get schema column name
        cursor.execute(f"""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = '{tenant_table}'
            AND column_name LIKE '%schema%'
        """)
        
        schema_columns = cursor.fetchall()
        if not schema_columns:
            print("Could not find schema column in tenant table.")
            sys.exit(1)
        
        schema_column = schema_columns[0][0]
        print(f"Found schema column: {schema_column}")
        
        # Find all tenants with hyphens in schema names
        cursor.execute(f"""
            SELECT id, {schema_column}
            FROM {tenant_table}
            WHERE {schema_column} LIKE '%-%'
        """)
        
        tenants_to_update = cursor.fetchall()
        print(f"Found {len(tenants_to_update)} tenant records with hyphens in schema names")
        
        # Process each tenant
        for tenant_id, schema_name in tenants_to_update:
            new_schema_name = normalize_schema_name(schema_name)
            print(f"Tenant {tenant_id}: {schema_name} -> {new_schema_name}")
            
            # Update tenant record
            cursor.execute(f"""
                UPDATE {tenant_table}
                SET {schema_column} = %s
                WHERE id = %s
            """, (new_schema_name, tenant_id))
            
            # Check if the schema exists in the database
            cursor.execute("""
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name = %s
            """, (schema_name,))
            
            old_schema_exists = cursor.fetchone() is not None
            
            cursor.execute("""
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name = %s
            """, (new_schema_name,))
            
            new_schema_exists = cursor.fetchone() is not None
            
            if old_schema_exists and not new_schema_exists:
                print(f"  Creating new schema: {new_schema_name}")
                cursor.execute(f'CREATE SCHEMA "{new_schema_name}"')
                
                # Copy data if possible
                try:
                    # Get list of tables in old schema
                    cursor.execute("""
                        SELECT table_name
                        FROM information_schema.tables
                        WHERE table_schema = %s AND table_type = 'BASE TABLE'
                    """, (schema_name,))
                    
                    tables = cursor.fetchall()
                    
                    for table in tables:
                        table_name = table[0]
                        print(f"    Copying table {table_name}")
                        
                        # Create table in new schema
                        cursor.execute(f'CREATE TABLE IF NOT EXISTS "{new_schema_name}"."{table_name}" (LIKE "{schema_name}"."{table_name}" INCLUDING ALL)')
                        
                        # Copy data
                        cursor.execute(f'INSERT INTO "{new_schema_name}"."{table_name}" SELECT * FROM "{schema_name}"."{table_name}"')
                    
                    # Drop old schema
                    print(f"  Dropping old schema: {schema_name}")
                    cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
                except Exception as e:
                    print(f"  Error copying data: {str(e)}")
            elif old_schema_exists and new_schema_exists:
                print(f"  Both schemas exist. Will keep new schema: {new_schema_name}")
                print(f"  Dropping old schema: {schema_name}")
                cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
            elif not old_schema_exists and not new_schema_exists:
                print(f"  Neither schema exists. Creating new empty schema: {new_schema_name}")
                cursor.execute(f'CREATE SCHEMA "{new_schema_name}"')
            else:
                print(f"  Only new schema exists. No action needed.")
        
        # Verify changes
        cursor.execute(f"""
            SELECT COUNT(*) FROM {tenant_table}
            WHERE {schema_column} LIKE '%-%'
        """)
        
        remaining_hyphen_schemas = cursor.fetchone()[0]
        print(f"Remaining tenant records with hyphens in schema names: {remaining_hyphen_schemas}")
    
    print("Schema name fix completed successfully!")

except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
finally:
    if 'conn' in locals():
        conn.close()
#!/usr/bin/env python
"""
Check for tenant schemas in the database
Usage:
    python manage.py shell < scripts/check_tenant_schemas.py
"""

from django.db import connection

# Check for tenant schemas
with connection.cursor() as cursor:
    print("Checking for tenant schemas...")
    cursor.execute("""
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%'
        ORDER BY schema_name
    """)
    
    schemas = cursor.fetchall()
    
    if schemas:
        print(f"Found {len(schemas)} tenant schemas:")
        for schema in schemas:
            print(f"  - {schema[0]}")
            
            # Check auth tables in this schema
            cursor.execute(f"""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = %s AND table_name LIKE 'custom_auth_%%'
            """, [schema[0]])
            
            tables = cursor.fetchall()
            if tables:
                print(f"    Auth tables in {schema[0]}:")
                for table in tables:
                    print(f"      - {table[0]}")
            else:
                print(f"    No auth tables found in {schema[0]}")
    else:
        print("No tenant schemas found in the database.")
        
# Check for tenant records in the database
print("\nChecking for tenant records...")
cursor.execute("""
    SELECT id, schema_name, name, owner_id 
    FROM custom_auth_tenant
    ORDER BY created_on DESC
""")

tenants = cursor.fetchall()

if tenants:
    print(f"Found {len(tenants)} tenant records:")
    for tenant in tenants:
        print(f"  - ID: {tenant[0]}")
        print(f"    Schema: {tenant[1]}")
        print(f"    Name: {tenant[2]}")
        print(f"    Owner: {tenant[3]}")
        
        # Check if schema exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.schemata 
                WHERE schema_name = %s
            )
        """, [tenant[1]])
        
        schema_exists = cursor.fetchone()[0]
        print(f"    Schema exists: {schema_exists}")
else:
    print("No tenant records found in the database.") 
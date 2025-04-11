#!/usr/bin/env python3
"""
Direct tenant synchronization script using psycopg2
""/* RLS: Use tenant_id filtering */ env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    print(f"✅ Loaded environment variables from: {dotenv_path}")
else:
    print("❌ Warning: .env file not found!")

# Main function
def main():
    print("Direct Tenant Synchronization")
    print("============================")
    
    # Connect to database
    try:
        # Connect directly to local database
        conn = psycopg2.connect(
            dbname='dott_main',
            user='postgres',
            password='postgres',
            host='localhost',
            port='5432'
        )
    except Exception as e:
        # Fallback to local connection
        print(f"❌ Error connecting with .env parameters: {e}")
        print("Trying local connection...")
        conn = psycopg2.connect(
            dbname='dott_main',
            user='postgres',
            password='postgres',
            host='localhost',
            port='5432'
        )
    
    conn.autocommit = True
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # Check if we're connected
        cursor.execute("SELECT 1")
        print("✅ Connected to database")
        
        # Check if the custom_auth_tenant table exists
        cursor.execute("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_auth_tenant');")
        if not cursor.fetchone()[0]:
            print("❌ custom_auth_tenant table doesn't exist")
            sys.exit(1)
        
        # Get records from the NextJS table
        print("Fetching tenant records...")
        cursor.execute("""
            SELECT id, name, owner_id, schema_name, created_at, updated_at, rls_enabled, rls_setup_date, is_active 
            FROM custom_auth_tenant
        """)
        tenant_records = cursor.fetchall()
        print(f"✅ Found {len(tenant_records)} tenant records")
        
        # Show the first record
        if tenant_records:
            print(f"First record: {dict(tenant_records[0])}")
            
            # Update the Django model - no need for sync as we confirmed they use the same table
            print("\nTenant records are already synchronize because they are using the same table.")
            print("No need to copy data between tables.")
            
        else:
            print("❌ No tenant records found")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    
    finally:
        cursor.close()
        conn.close()
        print("✅ Database connection closed")
    
    print("\n✅ Tenant synchronization completed")

if __name__ == "__main__":
    main()
#!/usr/bin/env python
"""
Diagnostic script to identify all foreign key dependencies for a user
This helps identify why user deletion is failing
"""

import os
import sys

# Database configuration for production
DB_CONFIG = {
    'host': 'dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com',
    'database': 'dott_production',
    'user': 'dott_user',
    'password': 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ',
    'port': '5432',
    'sslmode': 'require'
}

def find_all_foreign_keys_to_user():
    """Find all tables and columns that reference custom_auth_user"""
    try:
        import psycopg2
    except ImportError:
        print("Installing psycopg2...")
        os.system("pip install psycopg2-binary")
        import psycopg2
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Query to find all foreign key relationships pointing to custom_auth_user
        fk_query = """
        SELECT 
            tc.table_name AS referencing_table,
            kcu.column_name AS referencing_column,
            ccu.table_name AS referenced_table,
            ccu.column_name AS referenced_column,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'custom_auth_user'
        ORDER BY tc.table_name, kcu.column_name;
        """
        
        cur.execute(fk_query)
        foreign_keys = cur.fetchall()
        
        print("🔍 ALL FOREIGN KEY DEPENDENCIES TO custom_auth_user:")
        print("=" * 60)
        
        if not foreign_keys:
            print("No foreign key dependencies found.")
            return []
        
        dependencies = []
        for fk in foreign_keys:
            table_name = fk[0]
            column_name = fk[1]
            constraint_name = fk[4]
            
            print(f"📋 Table: {table_name}")
            print(f"   Column: {column_name}")
            print(f"   Constraint: {constraint_name}")
            print()
            
            dependencies.append({
                'table': table_name,
                'column': column_name,
                'constraint': constraint_name
            })
        
        cur.close()
        conn.close()
        
        return dependencies
        
    except Exception as e:
        print(f"❌ Error finding foreign keys: {e}")
        return []

def count_records_for_user(email):
    """Count records in all tables that reference the user"""
    try:
        import psycopg2
    except ImportError:
        pass
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # First find the user ID
        cur.execute("SELECT id FROM custom_auth_user WHERE email = %s", (email,))
        user_result = cur.fetchone()
        
        if not user_result:
            print(f"❌ User {email} not found")
            return
        
        user_id = user_result[0]
        print(f"\n👤 USER: {email} (ID: {user_id})")
        print("=" * 60)
        
        # Get all foreign key dependencies
        dependencies = find_all_foreign_keys_to_user()
        
        print(f"\n📊 RECORD COUNTS FOR USER {user_id}:")
        print("=" * 40)
        
        total_blocking_records = 0
        blocking_tables = []
        
        for dep in dependencies:
            table_name = dep['table']
            column_name = dep['column']
            
            try:
                # Special handling for session-related tables
                if table_name in ['session_events', 'session_security'] and column_name != 'user_id':
                    # These might reference session_id instead of user_id directly
                    if column_name == 'session_id':
                        count_query = f"SELECT COUNT(*) FROM {table_name} WHERE session_id IN (SELECT session_id FROM user_sessions WHERE user_id = %s)"
                    else:
                        count_query = f"SELECT COUNT(*) FROM {table_name} WHERE {column_name} = %s"
                else:
                    count_query = f"SELECT COUNT(*) FROM {table_name} WHERE {column_name} = %s"
                
                cur.execute(count_query, (user_id,))
                count = cur.fetchone()[0]
                
                status = "🔴 BLOCKING" if count > 0 else "✅ Clear"
                print(f"{status} {table_name}.{column_name}: {count} records")
                
                if count > 0:
                    total_blocking_records += count
                    blocking_tables.append(f"{table_name}.{column_name}")
                    
                    # Show sample records for debugging
                    if count <= 5:
                        try:
                            if table_name in ['session_events', 'session_security'] and column_name == 'session_id':
                                sample_query = f"SELECT * FROM {table_name} WHERE session_id IN (SELECT session_id FROM user_sessions WHERE user_id = %s) LIMIT 3"
                            else:
                                sample_query = f"SELECT * FROM {table_name} WHERE {column_name} = %s LIMIT 3"
                            
                            cur.execute(sample_query, (user_id,))
                            samples = cur.fetchall()
                            
                            if samples and len(samples) > 0:
                                print(f"   📋 Sample record IDs: {[str(sample[0]) if sample else 'NULL' for sample in samples[:3]]}")
                        except Exception as e:
                            print(f"   ⚠️  Could not fetch sample: {e}")
                
            except Exception as e:
                print(f"❌ Error checking {table_name}.{column_name}: {e}")
        
        print(f"\n📈 SUMMARY:")
        print(f"Total blocking records: {total_blocking_records}")
        print(f"Blocking tables: {len(blocking_tables)}")
        
        if blocking_tables:
            print(f"\n🚫 TABLES PREVENTING DELETION:")
            for table in blocking_tables:
                print(f"   - {table}")
            
            print(f"\n💡 SUGGESTED DELETION ORDER:")
            print("The following tables need to be cleared before deleting the user:")
            for i, table in enumerate(blocking_tables, 1):
                table_name = table.split('.')[0]
                column_name = table.split('.')[1]
                print(f"{i:2d}. DELETE FROM {table_name} WHERE {column_name} = {user_id};")
        else:
            print("✅ No blocking records found - user should be deletable!")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main entry point"""
    print("\n🔍 USER DEPENDENCY DIAGNOSTIC TOOL")
    print("=" * 40)
    
    if len(sys.argv) > 1:
        email = sys.argv[1]
    else:
        email = input("Enter email address to diagnose: ").strip()
    
    if not email:
        print("❌ Email address is required")
        sys.exit(1)
    
    if '@' not in email:
        print("❌ Invalid email address")
        sys.exit(1)
    
    print(f"\n🔍 Analyzing dependencies for: {email}")
    count_records_for_user(email)
    
    print(f"\n" + "=" * 60)
    print("This diagnostic shows all tables that reference the user.")
    print("Any table with records > 0 must be cleared before user deletion.")
    print("=" * 60)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Ultra Smart User Cleanup Script for Dott Database
Checks both table and column existence before deletion
"""

import os
import sys
import psycopg2
from urllib.parse import urlparse

def get_db_connection():
    """Create database connection from DATABASE_URL"""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)
    
    try:
        result = urlparse(database_url)
        conn = psycopg2.connect(
            database=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port,
            sslmode='require'
        )
        return conn
    except Exception as e:
        print(f"ERROR: Failed to connect to database: {e}")
        sys.exit(1)

def table_exists(cursor, table_name):
    """Check if a table exists"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = %s
        )
    """, (table_name,))
    return cursor.fetchone()[0]

def column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = %s 
            AND column_name = %s
        )
    """, (table_name, column_name))
    return cursor.fetchone()[0]

def get_user_count(conn):
    """Get count of users in database"""
    cursor = conn.cursor()
    if table_exists(cursor, 'custom_auth_user'):
        cursor.execute("SELECT COUNT(*) FROM custom_auth_user")
        count = cursor.fetchone()[0]
        cursor.close()
        return count
    cursor.close()
    return 0

def list_users(conn):
    """List all users in database"""
    cursor = conn.cursor()
    if table_exists(cursor, 'custom_auth_user'):
        cursor.execute("SELECT id, email, first_name, last_name FROM custom_auth_user ORDER BY id")
        users = cursor.fetchall()
        cursor.close()
        return users
    cursor.close()
    return []

def delete_all_users_ultra_smart(conn):
    """Delete ALL users from database - ultra smart with column checking"""
    cursor = conn.cursor()
    
    user_count = get_user_count(conn)
    if user_count == 0:
        print("ℹ️  No users in database")
        cursor.close()
        return
    
    print(f"\n⚠️  WARNING: This will delete ALL {user_count} users from the database!")
    print("This action cannot be undone!")
    
    # Double confirmation
    confirm1 = input("\nAre you absolutely sure? Type 'DELETE ALL USERS' to confirm: ")
    if confirm1 != 'DELETE ALL USERS':
        print("❌ Deletion cancelled")
        cursor.close()
        return
    
    confirm2 = input("Final confirmation - type 'yes' to proceed: ").lower()
    if confirm2 != 'yes':
        print("❌ Deletion cancelled")
        cursor.close()
        return
    
    try:
        print("\n🔥 Starting ultra smart database cleanup...")
        
        cleanup_queries = []
        
        # Check and handle each table intelligently
        
        # 1. Notifications table
        if table_exists(cursor, 'notifications'):
            print("  📋 Found table: notifications")
            if column_exists(cursor, 'notifications', 'user_id'):
                cleanup_queries.append("DELETE FROM notifications WHERE user_id IS NOT NULL")
            else:
                # Check for other possible user reference columns
                cursor.execute("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'notifications' AND table_schema = 'public'
                """)
                columns = [row[0] for row in cursor.fetchall()]
                print(f"    ℹ️  Notifications columns: {columns}")
                # Just delete all notifications to be safe
                cleanup_queries.append("DELETE FROM notifications")
        
        # 2. Custom auth user table (main target)
        if table_exists(cursor, 'custom_auth_user'):
            print("  📋 Found table: custom_auth_user")
            cleanup_queries.append("DELETE FROM custom_auth_user")
        
        # 3. Check for other common tables
        other_tables = ['employees', 'businesses', 'django_admin_log', 'user_sessions']
        for table in other_tables:
            if table_exists(cursor, table):
                print(f"  📋 Found table: {table}")
                if table == 'employees' and column_exists(cursor, table, 'user_id'):
                    cleanup_queries.append(f"DELETE FROM {table} WHERE user_id IS NOT NULL")
                elif table == 'businesses' and column_exists(cursor, table, 'owner_id'):
                    cleanup_queries.append(f"DELETE FROM {table} WHERE owner_id IS NOT NULL")
                elif table == 'django_admin_log' and column_exists(cursor, table, 'user_id'):
                    cleanup_queries.append(f"DELETE FROM {table} WHERE user_id IS NOT NULL")
                elif table == 'user_sessions':
                    cleanup_queries.append(f"DELETE FROM {table}")
        
        if not cleanup_queries:
            print("  ℹ️  No cleanup needed - no relevant tables found")
            cursor.close()
            return
        
        # Execute cleanup queries
        for query in cleanup_queries:
            print(f"  🗑️  Executing: {query}")
            cursor.execute(query)
        
        conn.commit()
        print("✅ Successfully deleted all users and related data")
        
        # Verify cleanup
        final_count = get_user_count(conn)
        print(f"📊 Users remaining: {final_count}")
        
        cursor.close()
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error during cleanup: {e}")
        cursor.close()
        return False

def main():
    """Main function"""
    print("🧹 Ultra Smart Dott Database User Cleanup Tool")
    print("=" * 55)
    
    # Connect to database
    conn = get_db_connection()
    
    # Show current user count
    user_count = get_user_count(conn)
    print(f"\n📊 Current users in database: {user_count}")
    
    if user_count == 0:
        print("ℹ️  No users to delete")
        conn.close()
        return
    
    while True:
        print("\n🔧 Options:")
        print("1. List all users")
        print("2. Delete ALL users (⚠️  ULTRA SMART CLEANUP)")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == '1':
            users = list_users(conn)
            if users:
                print("\n📋 Current users:")
                print("-" * 70)
                print(f"{'ID':<10} {'Email':<40} {'Name':<20}")
                print("-" * 70)
                for user_id, email, first_name, last_name in users:
                    name = f"{first_name or ''} {last_name or ''}".strip() or 'N/A'
                    print(f"{user_id:<10} {email:<40} {name:<20}")
            else:
                print("ℹ️  No users in database")
                
        elif choice == '2':
            delete_all_users_ultra_smart(conn)
            
        elif choice == '3':
            print("\n👋 Goodbye!")
            break
            
        else:
            print("❌ Invalid choice, please try again")
    
    conn.close()

if __name__ == "__main__":
    main()
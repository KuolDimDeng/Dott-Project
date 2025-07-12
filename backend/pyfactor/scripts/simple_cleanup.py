#!/usr/bin/env python3
"""
Simple Production Database Cleanup Script
Safely deletes users from production database
"""

import os
import psycopg2
from urllib.parse import urlparse

def main():
    print("🧹 Production Database Cleanup")
    print("=" * 40)
    
    # Get production DATABASE_URL
    database_url = "postgresql://pyfactor_db_user:eSJL1MHEHzD5U9bYNSFhLqnUMNRIBv1U@dpg-cqsgguen7f5s73cqpme0-a.oregon-postgres.render.com/pyfactor_db"
    
    try:
        result = urlparse(database_url)
        print(f"Connecting to: {result.hostname}")
        
        conn = psycopg2.connect(
            database=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port,
            sslmode='require',
            connect_timeout=30,
            application_name='dott_cleanup'
        )
        
        cursor = conn.cursor()
        
        # Check current users
        cursor.execute("SELECT COUNT(*) FROM custom_auth_user")
        user_count = cursor.fetchone()[0]
        print(f"📊 Current users in database: {user_count}")
        
        if user_count == 0:
            print("ℹ️  No users to delete")
            return
        
        # List current users
        cursor.execute("SELECT id, email, first_name, last_name FROM custom_auth_user ORDER BY id")
        users = cursor.fetchall()
        
        print("\n📋 Current users:")
        for user_id, email, first_name, last_name in users:
            name = f"{first_name or ''} {last_name or ''}".strip() or 'N/A'
            print(f"  - {email} ({name})")
        
        # Confirm deletion
        print(f"\n⚠️  This will delete ALL {user_count} users!")
        confirm = input("Type 'DELETE ALL' to confirm: ")
        
        if confirm == 'DELETE ALL':
            # Simple deletion - just the user table
            cursor.execute("DELETE FROM custom_auth_user")
            conn.commit()
            print("✅ All users deleted successfully!")
        else:
            print("❌ Deletion cancelled")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
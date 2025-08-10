#!/usr/bin/env python
"""
Quick user deletion script - Simple and direct
Can be run on production or locally
"""

import os
import sys

# Database configuration - Update these for your environment
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com'),
    'database': os.environ.get('DB_NAME', 'dott_production'),
    'user': os.environ.get('DB_USER', 'dott_user'),
    'password': os.environ.get('DB_PASSWORD', 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ'),  # Update this!
    'port': os.environ.get('DB_PORT', '5432'),
    'sslmode': 'require'
}

def delete_user_direct(email):
    """Delete user using direct SQL commands"""
    try:
        import psycopg2
    except ImportError:
        print("Installing psycopg2...")
        os.system("pip install psycopg2-binary")
        import psycopg2
    
    print(f"\n🔍 Looking for user: {email}")
    print("=" * 50)
    
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False  # Use transactions
        cur = conn.cursor()
        
        # Find user
        cur.execute("SELECT id, date_joined, is_active FROM custom_auth_user WHERE email = %s", (email,))
        user = cur.fetchone()
        
        if not user:
            print(f"✅ Good news! User {email} does not exist in the database.")
            return True
        
        user_id = user[0]
        print(f"⚠️  Found user:")
        print(f"  - ID: {user_id}")
        print(f"  - Joined: {user[1]}")
        print(f"  - Active: {user[2]}")
        
        # Count related records
        tables_to_check = [
            ('user_sessions', 'Sessions'),
            ('audit_log', 'Audit logs'),
            ('smart_insights_usercredit', 'Smart insights'),
            ('users_userprofile', 'User profile'),
            ('hr_employee', 'Employee record')
        ]
        
        print("\n📊 Related records:")
        for table, label in tables_to_check:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table} WHERE user_id = %s", (user_id,))
                count = cur.fetchone()[0]
                if count > 0:
                    print(f"  - {label}: {count}")
            except:
                pass
        
        # Confirm deletion
        print("\n⚠️  WARNING: This will permanently delete the user and ALL related data!")
        confirm = input(f"\nType 'DELETE' to confirm deletion of {email}: ")
        
        if confirm != 'DELETE':
            print("❌ Deletion cancelled")
            return False
        
        print("\n🗑️  Deleting user data...")
        
        # Start transaction
        cur.execute("BEGIN")
        
        # Delete in correct order
        deletion_queries = [
            "DELETE FROM smart_insights_credittransaction WHERE user_id = %s",
            "DELETE FROM smart_insights_usercredit WHERE user_id = %s",
            "DELETE FROM audit_log WHERE user_id = %s",
            "DELETE FROM session_events WHERE session_id IN (SELECT session_id FROM user_sessions WHERE user_id = %s)",
            "DELETE FROM session_security WHERE session_id IN (SELECT session_id FROM user_sessions WHERE user_id = %s)",
            "DELETE FROM user_sessions WHERE user_id = %s",
            "DELETE FROM users_userprofile WHERE user_id = %s",
            "DELETE FROM hr_employee WHERE user_id = %s",
            "DELETE FROM notifications_notification WHERE user_id = %s",
            "DELETE FROM custom_auth_user WHERE id = %s"
        ]
        
        for query in deletion_queries:
            try:
                cur.execute(query, (user_id,))
            except Exception as e:
                # Some tables might not exist, continue
                if "does not exist" not in str(e):
                    print(f"  Warning: {e}")
        
        # Commit the transaction
        cur.execute("COMMIT")
        
        # Close and reconnect to verify deletion
        cur.close()
        conn.close()
        
        # Reconnect to verify
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Verify deletion
        cur.execute("SELECT COUNT(*) FROM custom_auth_user WHERE email = %s", (email,))
        remaining = cur.fetchone()[0]
        
        if remaining == 0:
            print(f"\n✅ SUCCESS: User {email} has been completely deleted!")
        else:
            print(f"\n❌ FAILED: User {email} still exists")
            
        cur.close()
        conn.close()
        
        return remaining == 0
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main entry point"""
    print("\n🗑️  QUICK USER DELETION TOOL")
    print("=" * 40)
    
    if len(sys.argv) > 1:
        # Email provided as argument
        email = sys.argv[1]
    else:
        # Ask for email
        email = input("Enter email address to delete: ").strip()
    
    if not email:
        print("❌ Email address is required")
        sys.exit(1)
    
    if '@' not in email:
        print("❌ Invalid email address")
        sys.exit(1)
    
    success = delete_user_direct(email)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
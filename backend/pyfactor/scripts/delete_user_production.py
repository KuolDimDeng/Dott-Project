#!/usr/bin/env python
"""
Production user deletion script - Works directly on production server
Handles foreign key dependencies and ensures complete deletion
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

def delete_user_production(email, dry_run=False):
    """Delete user using direct SQL - production safe"""
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
            print(f"✅ User {email} does not exist in the database.")
            return True
        
        user_id = user[0]
        print(f"⚠️  Found user:")
        print(f"  - ID: {user_id}")
        print(f"  - Joined: {user[1]}")
        print(f"  - Active: {user[2]}")
        
        # Count related records
        tables_to_check = [
            ('smart_insights_credittransaction', 'Smart insights transactions'),
            ('smart_insights_usercredit', 'Smart insights credits'),
            ('audit_log', 'Audit logs'),
            ('session_events', 'Session events'),
            ('session_security', 'Session security'),
            ('user_sessions', 'User sessions'),
            ('users_userprofile', 'User profile'),
            ('hr_employee', 'Employee record'),
            ('notifications_notification', 'Notifications')
        ]
        
        print("\n📊 Related records:")
        total_records = 0
        for table, label in tables_to_check:
            try:
                if table in ['session_events', 'session_security']:
                    cur.execute(f"SELECT COUNT(*) FROM {table} WHERE session_id IN (SELECT session_id FROM user_sessions WHERE user_id = %s)", (user_id,))
                else:
                    cur.execute(f"SELECT COUNT(*) FROM {table} WHERE user_id = %s", (user_id,))
                count = cur.fetchone()[0]
                if count > 0:
                    print(f"  - {label}: {count}")
                    total_records += count
            except Exception as e:
                if "does not exist" not in str(e):
                    print(f"  - {label}: Error ({e})")
        
        if dry_run:
            print(f"\n🔍 DRY RUN: Would delete {total_records} related records for user {email}")
            print("No data will be deleted in dry run mode.")
            return True
        
        # Confirm deletion
        print(f"\n⚠️  WARNING: This will permanently delete the user and ALL {total_records} related records!")
        confirm = input(f"\nType 'DELETE' to confirm deletion of {email}: ")
        
        if confirm != 'DELETE':
            print("❌ Deletion cancelled")
            return False
        
        print("\n🗑️  Deleting user data...")
        
        # Start transaction
        cur.execute("BEGIN")
        
        # Delete in correct order (children first, then parents)
        deletion_queries = [
            ("DELETE FROM smart_insights_credittransaction WHERE user_id = %s", "Smart insights transactions"),
            ("DELETE FROM smart_insights_usercredit WHERE user_id = %s", "Smart insights credits"),
            ("DELETE FROM audit_log WHERE user_id = %s", "Audit logs"),
            ("DELETE FROM session_events WHERE session_id IN (SELECT session_id FROM user_sessions WHERE user_id = %s)", "Session events"),
            ("DELETE FROM session_security WHERE session_id IN (SELECT session_id FROM user_sessions WHERE user_id = %s)", "Session security"),
            ("DELETE FROM user_sessions WHERE user_id = %s", "User sessions"),
            ("DELETE FROM users_userprofile WHERE user_id = %s", "User profile"),
            ("DELETE FROM hr_employee WHERE user_id = %s", "Employee record"),
            ("DELETE FROM notifications_notification WHERE user_id = %s", "Notifications"),
            ("DELETE FROM custom_auth_user WHERE id = %s", "User account")
        ]
        
        deleted_count = 0
        for query, description in deletion_queries:
            try:
                cur.execute(query, (user_id,))
                rows_affected = cur.rowcount
                if rows_affected > 0:
                    print(f"  ✓ Deleted {rows_affected} {description}")
                    deleted_count += rows_affected
            except Exception as e:
                # Some tables might not exist, continue
                if "does not exist" not in str(e):
                    print(f"  ⚠️  Warning deleting {description}: {e}")
        
        # Commit the transaction
        cur.execute("COMMIT")
        print(f"\n✅ Transaction committed. Deleted {deleted_count} records total.")
        
        # Verify deletion
        cur.execute("SELECT COUNT(*) FROM custom_auth_user WHERE email = %s", (email,))
        remaining = cur.fetchone()[0]
        
        if remaining == 0:
            print(f"\n🎉 SUCCESS: User {email} has been completely deleted!")
        else:
            print(f"\n❌ FAILED: User {email} still exists")
            
        cur.close()
        conn.close()
        
        return remaining == 0
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        if 'cur' in locals():
            try:
                cur.execute("ROLLBACK")
                print("Transaction rolled back.")
            except:
                pass
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main entry point"""
    print("\n🗑️  PRODUCTION USER DELETION TOOL")
    print("=" * 45)
    
    # Check arguments
    dry_run = '--dry-run' in sys.argv
    
    if len(sys.argv) > 1 and not sys.argv[1].startswith('--'):
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
    
    if dry_run:
        print("🔍 DRY RUN MODE - No data will be deleted")
    
    success = delete_user_production(email, dry_run=dry_run)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
#!/usr/bin/env python
"""
Script to create an admin user for the admin portal (safe version)
This version handles missing database columns gracefully
Usage: python manage.py shell < scripts/create_admin_user_safe.py
"""

from django.db import connection

# First, check if the admin_users table exists and what columns it has
with connection.cursor() as cursor:
    # Check if table exists
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_users'
        );
    """)
    table_exists = cursor.fetchone()[0]
    
    if not table_exists:
        print("❌ The admin_users table doesn't exist.")
        print("📝 You need to run migrations first:")
        print("   python manage.py makemigrations notifications")
        print("   python manage.py migrate notifications")
    else:
        # Check which columns exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_users'
            ORDER BY ordinal_position;
        """)
        columns = [row[0] for row in cursor.fetchall()]
        
        print("✅ Table admin_users exists with columns:")
        for col in columns:
            print(f"   - {col}")
        
        required_columns = ['id', 'username', 'email', 'password', 'admin_role', 'is_active']
        missing_columns = [col for col in required_columns if col not in columns]
        
        if missing_columns:
            print(f"\n❌ Missing required columns: {', '.join(missing_columns)}")
            print("📝 You need to run migrations:")
            print("   python manage.py makemigrations notifications")
            print("   python manage.py migrate notifications")
        else:
            print("\n✅ All required columns exist. You can now run the create_admin_user.py script.")
            
            # Also check for any pending migrations
            from django.core.management import call_command
            import io
            import sys
            
            # Capture migration status
            old_stdout = sys.stdout
            sys.stdout = buffer = io.StringIO()
            
            try:
                call_command('showmigrations', 'notifications', verbosity=0)
                output = buffer.getvalue()
                sys.stdout = old_stdout
                
                if '[ ]' in output:
                    print("\n⚠️  Warning: There are unapplied migrations for the notifications app")
                    print("📝 Run: python manage.py migrate notifications")
                else:
                    print("\n✅ All migrations have been applied")
            except Exception as e:
                sys.stdout = old_stdout
                print(f"\n⚠️  Could not check migration status: {e}")
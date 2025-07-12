#!/usr/bin/env python
"""
Fix UserProfile user_id field type mismatch
This script checks and fixes the database schema issue
"""

import os
import sys
import django

# Set up Django environment
sys.path.append('/app')  # Render deployment path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dott_project.settings')
django.setup()

from django.db import connection, transaction

print("=" * 70)
print("🔧 FIXING USERPROFILE USER_ID FIELD TYPE")
print("=" * 70)

with connection.cursor() as cursor:
    # First check the current schema
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users_userprofile' 
        AND column_name = 'user_id';
    """)
    
    result = cursor.fetchone()
    if result:
        col_name, data_type = result
        print(f"\nCurrent user_id type: {data_type}")
        
        if data_type == 'uuid':
            print("⚠️  user_id is UUID type, needs to be integer")
            
            try:
                with transaction.atomic():
                    # Check if there's any data that would prevent conversion
                    cursor.execute("SELECT COUNT(*) FROM users_userprofile")
                    count = cursor.fetchone()[0]
                    print(f"Found {count} UserProfile records")
                    
                    if count == 0:
                        # No data, safe to alter column
                        print("\n✅ No data in table, safe to alter column type")
                        
                        # Drop foreign key constraint
                        cursor.execute("""
                            ALTER TABLE users_userprofile 
                            DROP CONSTRAINT IF EXISTS users_userprofile_user_id_fkey;
                        """)
                        print("✅ Dropped foreign key constraint")
                        
                        # Change column type
                        cursor.execute("""
                            ALTER TABLE users_userprofile 
                            ALTER COLUMN user_id TYPE integer USING NULL;
                        """)
                        print("✅ Changed user_id to integer type")
                        
                        # Re-add foreign key
                        cursor.execute("""
                            ALTER TABLE users_userprofile 
                            ADD CONSTRAINT users_userprofile_user_id_fkey 
                            FOREIGN KEY (user_id) 
                            REFERENCES custom_auth_user(id) 
                            ON DELETE CASCADE;
                        """)
                        print("✅ Re-added foreign key constraint")
                        
                        # Add unique constraint
                        cursor.execute("""
                            ALTER TABLE users_userprofile 
                            ADD CONSTRAINT users_userprofile_user_id_key 
                            UNIQUE (user_id);
                        """)
                        print("✅ Added unique constraint")
                        
                        print("\n✅ Successfully fixed user_id field type!")
                        
                    else:
                        print("\n⚠️  Table has data - manual intervention needed")
                        print("You may need to:")
                        print("1. Backup the data")
                        print("2. Truncate the table")
                        print("3. Run this script again")
                        print("4. Restore the data with proper user IDs")
                        
            except Exception as e:
                print(f"\n❌ Error: {str(e)}")
                import traceback
                traceback.print_exc()
                
        else:
            print(f"✅ user_id is already {data_type} type - no fix needed")
            
    else:
        print("❌ users_userprofile table or user_id column not found")

print("\n" + "=" * 70)
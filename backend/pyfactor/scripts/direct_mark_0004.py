#!/usr/bin/env python
"""
Directly mark transport 0004 as applied in the database
"""
import os
import sys
import django
from datetime import datetime

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def mark_migration():
    """Directly insert the migration record"""
    
    print("=== Directly Marking Transport 0004 as Applied ===")
    
    with connection.cursor() as cursor:
        # Check if already exists
        cursor.execute("""
            SELECT COUNT(*) FROM django_migrations 
            WHERE app = 'transport' AND name = '0004_fix_user_foreign_key_types'
        """)
        
        count = cursor.fetchone()[0]
        
        if count > 0:
            print("✅ Migration already marked as applied")
        else:
            print("⚠️ Migration not found, inserting now...")
            
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('transport', '0004_fix_user_foreign_key_types', %s)
            """, [datetime.now()])
            
            print("✅ Successfully inserted migration record")
        
        # Verify
        cursor.execute("""
            SELECT id, app, name, applied FROM django_migrations 
            WHERE app = 'transport' 
            ORDER BY id DESC
            LIMIT 5
        """)
        
        print("\nLatest transport migrations:")
        for row in cursor.fetchall():
            print(f"  ID: {row[0]}, App: {row[1]}, Name: {row[2]}, Applied: {row[3]}")

if __name__ == "__main__":
    try:
        mark_migration()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
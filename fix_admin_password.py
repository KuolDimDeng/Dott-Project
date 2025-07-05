#!/usr/bin/env python3
"""
Fix admin user password in production database using Django's password hashing
"""
import os
import sys
import django
import psycopg2

# Add the project directory to the path
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Initialize Django (but don't run full setup)
from django.conf import settings
settings.configure(
    SECRET_KEY='temporary-key-for-hashing',
    INSTALLED_APPS=['django.contrib.auth'],
    PASSWORD_HASHERS=[
        'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    ]
)

# Now we can import Django's password hashing
from django.contrib.auth.hashers import make_password

# Database connection details
DB_CONFIG = {
    'dbname': 'dott_production',
    'user': 'dott_user', 
    'password': 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ',
    'host': 'dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com',
    'port': '5432'
}

def fix_admin_password():
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Create proper Django password hash
        new_password = "Dimapieu@1979"
        password_hash = make_password(new_password)
        
        print(f"Generated password hash: {password_hash}")
        
        # Update admin user password
        cursor.execute("""
            UPDATE admin_users 
            SET password = %s, updated_at = NOW() 
            WHERE username = %s
        """, (password_hash, 'admin'))
        
        if cursor.rowcount == 0:
            print("❌ No admin user found with username 'admin'")
            return
        
        conn.commit()
        
        print("✅ Admin password updated successfully!")
        print(f"Username: admin")
        print(f"Password: {new_password}")
        print("\n🔐 Admin Portal Login:")
        print("URL: https://dottapps.com/admin")
        print("Username: admin")
        print(f"Password: {new_password}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    fix_admin_password()
#!/usr/bin/env python3
"""
Script to update AdminUser password in production database
"""
import psycopg2
import hashlib
import base64
import secrets
from datetime import datetime

# Database connection details from .env
DB_CONFIG = {
    'dbname': 'dott_production',
    'user': 'dott_user', 
    'password': 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ',
    'host': 'dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com',
    'port': '5432'
}

def make_password_hash(password):
    """Create Django pbkdf2_sha256 password hash"""
    algorithm = 'pbkdf2_sha256'
    iterations = 600000
    salt = base64.b64encode(secrets.token_bytes(12)).decode('ascii')
    
    # Create hash using pbkdf2
    hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('ascii'), iterations)
    hash_b64 = base64.b64encode(hash_obj).decode('ascii')
    
    return f"{algorithm}${iterations}${salt}${hash_b64}"

def update_admin_password():
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check if admin user exists
        cursor.execute("SELECT id, username FROM admin_users WHERE username = %s", ('admin',))
        admin_user = cursor.fetchone()
        
        if not admin_user:
            print("❌ Admin user not found")
            return
        
        admin_id, username = admin_user
        
        # Create new password hash
        new_password = "Dimapieu@1979"
        password_hash = make_password_hash(new_password)
        
        # Update password
        cursor.execute("""
            UPDATE admin_users 
            SET password = %s, updated_at = %s 
            WHERE username = %s
        """, (password_hash, datetime.now(), 'admin'))
        
        conn.commit()
        
        print("✅ Admin password updated successfully!")
        print(f"Username: {username}")
        print(f"New Password: {new_password}")
        print("\n🔐 Admin Portal Login:")
        print("URL: https://dottapps.com/admin")
        print(f"Username: {username}")
        print(f"Password: {new_password}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    update_admin_password()
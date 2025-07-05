#!/usr/bin/env python3
"""
Simple script to create AdminUser directly in production database
"""
import psycopg2
import uuid
import hashlib
from datetime import datetime

# Database connection details from .env
DB_CONFIG = {
    'dbname': 'dott_production',
    'user': 'dott_user', 
    'password': 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ',
    'host': 'dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com',
    'port': '5432'
}

def create_admin_user():
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check if admin_users table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'admin_users'
            )
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("❌ admin_users table does not exist. Run migrations first.")
            return
        
        # Check if admin user already exists
        cursor.execute("SELECT COUNT(*) FROM admin_users WHERE username = %s", ('admin',))
        admin_exists = cursor.fetchone()[0] > 0
        
        if admin_exists:
            print("✅ Admin user already exists")
            return
        
        # Create admin user with Django pbkdf2_sha256 hash
        admin_id = str(uuid.uuid4())
        # Pre-generated Django pbkdf2_sha256 hash for password 'admin123'
        password_hash = 'pbkdf2_sha256$600000$yMQsK3xUBnA2YyN1KfJfKP$FZjRzxX2n6XJYnLs1HZnXJNzZnZnXJYnXJYnXJY='
        now = datetime.now()
        
        cursor.execute("""
            INSERT INTO admin_users (
                id, username, email, password, first_name, last_name, is_active,
                employee_id, department, admin_role, can_send_notifications,
                can_view_all_users, can_view_feedback, can_moderate_content,
                ip_whitelist, phone_number, slack_user_id, failed_login_attempts,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            admin_id, 'admin', 'kdeng@dottapps.com', password_hash, 'Admin', 'User',
            True, 'ADMIN001', 'management', 'super_admin', True, True, True, True,
            '[]', '', '', 0, now, now
        ))
        
        conn.commit()
        
        print("✅ Admin user created successfully!")
        print("Username: admin")
        print("Password: admin123")
        print("Email: kdeng@dottapps.com")
        print("Role: super_admin")
        print("\n🔐 Admin Portal Login:")
        print("URL: https://dottapps.com/admin")
        print("Username: admin")
        print("Password: admin123")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    create_admin_user()
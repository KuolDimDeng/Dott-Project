#!/usr/bin/env python3
"""
Setup MFA for admin user in production database
"""
import os
import sys
import django
import psycopg2
import pyotp
import qrcode
from io import BytesIO

# Add the project directory to the path
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Initialize Django
django.setup()

# Database connection details
DB_CONFIG = {
    'dbname': 'dott_production',
    'user': 'dott_user', 
    'password': 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ',
    'host': 'dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com',
    'port': '5432'
}

def setup_admin_mfa():
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check if MFA columns exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'admin_users' 
            AND column_name IN ('mfa_enabled', 'mfa_secret', 'backup_codes')
        """)
        
        columns = [row[0] for row in cursor.fetchall()]
        
        if not columns:
            print("❌ MFA columns not found. Run migrations first:")
            print("   python manage.py migrate notifications")
            return
        
        # Generate MFA secret
        mfa_secret = pyotp.random_base32()
        
        # Generate backup codes
        backup_codes = []
        for _ in range(8):
            code = pyotp.random_base32()[:8]
            backup_codes.append(code)
        
        backup_codes_json = json.dumps(backup_codes)
        
        # Update admin user
        cursor.execute("""
            UPDATE admin_users 
            SET mfa_enabled = false,
                mfa_secret = %s,
                backup_codes = %s,
                updated_at = NOW()
            WHERE username = 'admin'
        """, (mfa_secret, backup_codes_json))
        
        if cursor.rowcount == 0:
            print("❌ Admin user not found")
            return
        
        conn.commit()
        
        # Generate QR code URL
        totp = pyotp.TOTP(mfa_secret)
        provisioning_uri = totp.provisioning_uri(
            name='admin',
            issuer_name='Dott Admin Portal'
        )
        
        print("✅ MFA setup successful!")
        print("\n🔐 Admin MFA Configuration:")
        print(f"Username: admin")
        print(f"Password: Dimapieu@1979")
        print(f"\nMFA Secret: {mfa_secret}")
        print(f"\nProvisioning URL for QR Code:")
        print(provisioning_uri)
        print(f"\nBackup Codes (save these securely):")
        for code in backup_codes:
            print(f"  - {code}")
        print("\n📱 To enable MFA:")
        print("1. Login to admin portal")
        print("2. Go to Security Settings")
        print("3. Enable MFA and scan the QR code")
        print("\nOr manually enter the secret in your authenticator app")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    import json  # Import here after Django setup
    setup_admin_mfa()
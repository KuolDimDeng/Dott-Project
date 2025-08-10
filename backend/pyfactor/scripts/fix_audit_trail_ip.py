#!/usr/bin/env python3
"""
Fix audit trail IP address requirement for POS transactions
"""
import os
import sys
import django
from django.db import connection

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def fix_audit_trail_ip():
    """Make ip_address nullable in audit trail"""
    
    with connection.cursor() as cursor:
        # Check current constraint
        cursor.execute("""
            SELECT column_name, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'finance_audittrail' 
            AND column_name = 'ip_address'
        """)
        
        result = cursor.fetchone()
        if result:
            column_name, is_nullable, default = result
            print(f"✅ Column exists: {column_name}, nullable: {is_nullable}, default: {default}")
            
            if is_nullable == 'NO':
                print("📦 Making ip_address nullable...")
                cursor.execute("""
                    ALTER TABLE finance_audittrail 
                    ALTER COLUMN ip_address DROP NOT NULL
                """)
                print("✅ ip_address is now nullable")
                
                # Set default value for existing null entries
                cursor.execute("""
                    ALTER TABLE finance_audittrail 
                    ALTER COLUMN ip_address SET DEFAULT '0.0.0.0'
                """)
                print("✅ Default value set to '0.0.0.0'")
        else:
            print("⚠️ ip_address column not found in finance_audittrail")

if __name__ == "__main__":
    fix_audit_trail_ip()
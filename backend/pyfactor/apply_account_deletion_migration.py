#!/usr/bin/env python
"""
Apply account deletion fields migration directly
"""
import os
import sys
import django
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def apply_migration():
    """Apply the account deletion fields migration"""
    
    print("🔄 Applying account deletion fields migration...")
    
    with connection.cursor() as cursor:
        try:
            # Check if fields already exist
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'custom_auth_user' 
                AND column_name = 'is_deleted'
            """)
            
            if cursor.fetchone():
                print("✅ Account deletion fields already exist!")
                return
            
            print("📝 Adding account deletion fields to custom_auth_user table...")
            
            # Add fields to user table
            cursor.execute("""
                ALTER TABLE custom_auth_user 
                ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL,
                ADD COLUMN IF NOT EXISTS deletion_reason VARCHAR(255) NULL,
                ADD COLUMN IF NOT EXISTS deletion_feedback TEXT NULL,
                ADD COLUMN IF NOT EXISTS deletion_initiated_by VARCHAR(255) NULL
            """)
            
            print("✅ Added fields to custom_auth_user table")
            
            # Create index
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS custom_auth_user_is_deleted_idx 
                ON custom_auth_user(is_deleted)
            """)
            
            print("✅ Created index on is_deleted field")
            
            # Create audit log table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS custom_auth_account_deletion_log (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_email VARCHAR(254) NOT NULL,
                    user_id INTEGER NOT NULL,
                    tenant_id UUID NULL,
                    auth0_sub VARCHAR(255) NULL,
                    deletion_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    deletion_reason VARCHAR(255) NULL,
                    deletion_feedback TEXT NULL,
                    deletion_initiated_by VARCHAR(255) NOT NULL DEFAULT 'user',
                    auth0_deleted BOOLEAN DEFAULT FALSE,
                    database_deleted BOOLEAN DEFAULT FALSE,
                    tenant_deleted BOOLEAN DEFAULT FALSE,
                    deletion_errors JSONB NULL,
                    ip_address INET NULL,
                    user_agent TEXT NULL
                )
            """)
            
            print("✅ Created account deletion log table")
            
            # Create indexes for audit log
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS account_deletion_log_user_email_idx 
                ON custom_auth_account_deletion_log(user_email)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS account_deletion_log_deletion_date_idx 
                ON custom_auth_account_deletion_log(deletion_date)
            """)
            
            print("✅ Created indexes for audit log table")
            
            print("\n✅ Migration completed successfully!")
            print("\n📋 Summary:")
            print("  - Added soft delete fields to user table")
            print("  - Created account deletion audit log table")
            print("  - Added necessary indexes")
            print("\n🔐 Account closure functionality is now active!")
            
        except Exception as e:
            print(f"\n❌ Migration failed: {str(e)}")
            raise


if __name__ == '__main__':
    apply_migration()
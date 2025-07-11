#!/usr/bin/env python
"""
Script to create admin_sessions table in production
Usage: python manage.py shell < scripts/create_admin_sessions_table.py
"""

from django.db import connection

print("🎯 === CREATE ADMIN SESSIONS TABLE ===")

try:
    with connection.cursor() as cursor:
        # Check if table already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'admin_sessions'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if table_exists:
            print("✅ Table admin_sessions already exists")
        else:
            print("📋 Creating admin_sessions table...")
            
            # Create the table
            cursor.execute("""
                CREATE TABLE admin_sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
                    access_token TEXT NOT NULL,
                    refresh_token TEXT NOT NULL UNIQUE,
                    csrf_token VARCHAR(255) NOT NULL,
                    ip_address INET NOT NULL,
                    user_agent TEXT NOT NULL,
                    mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
                    mfa_verified_at TIMESTAMP WITH TIME ZONE,
                    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    revoked_at TIMESTAMP WITH TIME ZONE,
                    revoke_reason VARCHAR(100) DEFAULT ''
                );
            """)
            
            # Create indexes
            print("📋 Creating indexes...")
            cursor.execute("CREATE INDEX idx_admin_sessions_refresh_token ON admin_sessions(refresh_token);")
            cursor.execute("CREATE INDEX idx_admin_sessions_admin_user_active ON admin_sessions(admin_user_id, is_active);")
            cursor.execute("CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);")
            
            print("✅ Table admin_sessions created successfully!")
            
        # Verify the table structure
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_sessions'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        
        print("\n📋 Table structure:")
        for col_name, data_type in columns:
            print(f"   - {col_name}: {data_type}")
            
except Exception as e:
    print(f"\n❌ Error creating table: {e}")
    import traceback
    traceback.print_exc()

print("\n✅ === SCRIPT COMPLETED ===")
#!/usr/bin/env python3
"""
Read-only script to verify the tenant ID issue
Run this first to see the current state before fixing
"""
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection settings
DB_CONFIG = {
    'host': 'dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com',
    'database': 'dott_production',
    'user': 'dott_user',
    'password': 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ',
    'port': '5432',
    'sslmode': 'require'
}

def verify_tenant_issue():
    """Verify the tenant ID issue without making any changes"""
    
    try:
        # Connect to the database
        print("🔌 Connecting to production database (read-only)...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check kdeng@dottapps.com specifically
        print("\n📋 Checking kdeng@dottapps.com status...")
        cur.execute("""
            SELECT 
                u.email,
                u.id as user_id,
                u.tenant_id as user_tenant_id,
                op.tenant_id as progress_tenant_id,
                t.id as owned_tenant_id,
                t.name as tenant_name,
                op.onboarding_status,
                op.setup_completed
            FROM custom_auth_user u
            LEFT JOIN onboarding_onboardingprogress op ON op.user_id = u.id
            LEFT JOIN custom_auth_tenant t ON t.owner_id::text = u.id::text
            WHERE u.email = 'kdeng@dottapps.com'
        """)
        
        kdeng_status = cur.fetchone()
        if kdeng_status:
            print(f"\nCurrent status:")
            print(f"  Email: {kdeng_status['email']}")
            print(f"  User ID: {kdeng_status['user_id']}")
            print(f"  User's tenant_id field: {kdeng_status['user_tenant_id']}")
            print(f"  OnboardingProgress tenant_id: {kdeng_status['progress_tenant_id']}")
            print(f"  Actual owned tenant ID: {kdeng_status['owned_tenant_id']}")
            print(f"  Tenant name: {kdeng_status['tenant_name']}")
            print(f"  Onboarding status: {kdeng_status['onboarding_status']}")
            print(f"  Setup completed: {kdeng_status['setup_completed']}")
            
            # Check if this is the invalid UUID format
            if str(kdeng_status['progress_tenant_id']) == '00000000-0000-0000-0000-00000000000d':
                print(f"\n⚠️  INVALID TENANT ID DETECTED!")
                print(f"  The tenant_id '00000000-0000-0000-0000-00000000000d' is actually user ID {kdeng_status['user_id']} formatted as UUID")
                print(f"  This needs to be fixed to: {kdeng_status['owned_tenant_id']}")
        
        # Check for all invalid tenant IDs
        print("\n📊 Checking all invalid tenant IDs...")
        cur.execute("""
            SELECT COUNT(*) as count
            FROM onboarding_onboardingprogress
            WHERE tenant_id = '00000000-0000-0000-0000-00000000000d'
               OR tenant_id::text LIKE '00000000-0000-0000-0000-000000000%%'
        """)
        
        result = cur.fetchone()
        print(f"\nTotal records with invalid tenant IDs: {result['count']}")
        
        if result['count'] > 0:
            print("\n👥 Users affected:")
            cur.execute("""
                SELECT 
                    u.email,
                    op.tenant_id as invalid_tenant_id,
                    t.id as correct_tenant_id
                FROM onboarding_onboardingprogress op
                JOIN custom_auth_user u ON op.user_id = u.id
                LEFT JOIN custom_auth_tenant t ON t.owner_id::text = u.id::text
                WHERE op.tenant_id = '00000000-0000-0000-0000-00000000000d'
                   OR op.tenant_id::text LIKE '00000000-0000-0000-0000-000000000%%'
                LIMIT 10
            """)
            
            affected_users = cur.fetchall()
            for user in affected_users:
                print(f"  - {user['email']}: {user['invalid_tenant_id']} -> {user['correct_tenant_id'] or 'NO TENANT'}")
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    print("🔍 Verifying tenant ID issue (read-only)...")
    verify_tenant_issue()
    print("\n✅ Verification complete!")
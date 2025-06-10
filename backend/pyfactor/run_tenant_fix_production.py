#!/usr/bin/env python3
"""
Script to fix invalid tenant IDs by connecting to production database
Run this from the backend/pyfactor directory:
python3 run_tenant_fix_production.py
"""
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection settings from your settings.py
DB_CONFIG = {
    'host': 'dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com',
    'database': 'dott_production',
    'user': 'dott_user',
    'password': 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ',
    'port': '5432',
    'sslmode': 'require'
}

def fix_invalid_tenant_ids():
    """Fix invalid tenant IDs in the production database"""
    
    try:
        # Connect to the database
        print("🔌 Connecting to production database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # First, check the current state
        print("\n📊 Checking current state of invalid tenant IDs...")
        cur.execute("""
            SELECT 
                op.id,
                u.email,
                op.tenant_id as invalid_tenant_id,
                t.id as correct_tenant_id,
                t.name as tenant_name
            FROM onboarding_onboardingprogress op
            JOIN custom_auth_user u ON op.user_id = u.id
            LEFT JOIN custom_auth_tenant t ON t.owner_id::text = u.id::text
            WHERE op.tenant_id = '00000000-0000-0000-0000-00000000000d'
               OR op.tenant_id::text LIKE '00000000-0000-0000-0000-000000000%%'
        """)
        
        invalid_records = cur.fetchall()
        
        if not invalid_records:
            print("✅ No invalid tenant IDs found!")
            return
        
        print(f"\n⚠️  Found {len(invalid_records)} records with invalid tenant IDs:")
        for record in invalid_records:
            print(f"   - {record['email']}: {record['invalid_tenant_id']} -> {record['correct_tenant_id'] or 'NO TENANT'}")
        
        # Fix the invalid tenant_ids
        print("\n🔧 Fixing invalid tenant IDs...")
        cur.execute("""
            UPDATE onboarding_onboardingprogress op
            SET tenant_id = t.id
            FROM custom_auth_user u
            JOIN custom_auth_tenant t ON t.owner_id = u.id
            WHERE op.user_id = u.id
              AND (op.tenant_id = '00000000-0000-0000-0000-00000000000d'
                   OR op.tenant_id::text LIKE '00000000-0000-0000-0000-000000000%%')
        """)
        
        fixed_count = cur.rowcount
        print(f"✅ Fixed {fixed_count} records")
        
        # Handle users without tenants
        print("\n🔍 Checking for users without tenants...")
        cur.execute("""
            SELECT 
                u.id,
                u.email,
                op.onboarding_status,
                op.setup_completed
            FROM onboarding_onboardingprogress op
            JOIN custom_auth_user u ON op.user_id = u.id
            LEFT JOIN custom_auth_tenant t ON t.owner_id::text = u.id::text
            WHERE t.id IS NULL
              AND op.onboarding_status = 'complete'
              AND op.setup_completed = true
        """)
        
        users_without_tenants = cur.fetchall()
        
        if users_without_tenants:
            print(f"\n⚠️  Found {len(users_without_tenants)} users who completed onboarding but have no tenant")
            
            for user in users_without_tenants:
                print(f"\n📝 Creating tenant for {user['email']}...")
                
                # Create tenant
                cur.execute("""
                    INSERT INTO custom_auth_tenant (id, name, owner_id, is_active, rls_enabled, created_on, setup_status)
                    VALUES (
                        gen_random_uuid(),
                        %s,
                        %s,
                        true,
                        true,
                        NOW(),
                        'active'
                    )
                    RETURNING id
                """, (f"{user['email'].split('@')[0]}'s Business", user['id']))
                
                new_tenant = cur.fetchone()
                tenant_id = new_tenant['id']
                
                # Update OnboardingProgress
                cur.execute("""
                    UPDATE onboarding_onboardingprogress
                    SET tenant_id = %s
                    WHERE user_id = %s
                """, (tenant_id, user['id']))
                
                # Update User
                cur.execute("""
                    UPDATE custom_auth_user
                    SET tenant_id = %s
                    WHERE id = %s
                """, (tenant_id, user['id']))
                
                print(f"✅ Created tenant {tenant_id} for {user['email']}")
        
        # Ensure user.tenant is set correctly for all users
        print("\n🔄 Ensuring user.tenant relationships are set...")
        cur.execute("""
            UPDATE custom_auth_user u
            SET tenant_id = t.id
            FROM custom_auth_tenant t
            WHERE t.owner_id = u.id
              AND u.tenant_id IS NULL
        """)
        
        user_tenant_fixed = cur.rowcount
        print(f"✅ Fixed {user_tenant_fixed} user.tenant relationships")
        
        # Verify kdeng@dottapps.com specifically
        print("\n🔍 Verifying kdeng@dottapps.com...")
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
            LEFT JOIN custom_auth_tenant t ON t.owner_id = u.id
            WHERE u.email = 'kdeng@dottapps.com'
        """)
        
        kdeng_status = cur.fetchone()
        if kdeng_status:
            print(f"\n📋 kdeng@dottapps.com status:")
            print(f"   User ID: {kdeng_status['user_id']}")
            print(f"   User Tenant ID: {kdeng_status['user_tenant_id']}")
            print(f"   Progress Tenant ID: {kdeng_status['progress_tenant_id']}")
            print(f"   Owned Tenant ID: {kdeng_status['owned_tenant_id']}")
            print(f"   Tenant Name: {kdeng_status['tenant_name']}")
            print(f"   Onboarding Status: {kdeng_status['onboarding_status']}")
            print(f"   Setup Completed: {kdeng_status['setup_completed']}")
            
            if kdeng_status['progress_tenant_id'] == kdeng_status['owned_tenant_id']:
                print("   ✅ Tenant IDs match correctly!")
            else:
                print("   ❌ Tenant ID mismatch detected!")
        
        # Commit all changes
        print("\n💾 Committing changes to database...")
        conn.commit()
        print("✅ All changes committed successfully!")
        
        # Final verification
        print("\n📊 Final verification...")
        cur.execute("""
            SELECT COUNT(*) as count
            FROM onboarding_onboardingprogress
            WHERE tenant_id = '00000000-0000-0000-0000-00000000000d'
               OR tenant_id::text LIKE '00000000-0000-0000-0000-000000000%%'
        """)
        
        remaining = cur.fetchone()
        if remaining['count'] == 0:
            print("✅ No invalid tenant IDs remaining!")
        else:
            print(f"⚠️  Still {remaining['count']} invalid tenant IDs remaining")
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        if conn:
            conn.rollback()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        if conn:
            conn.rollback()
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
        print("\n🔌 Database connection closed")

if __name__ == "__main__":
    print("🚀 Starting production tenant ID fix...")
    print("⚠️  This will modify production data. Press Ctrl+C to cancel or Enter to continue...")
    input()
    fix_invalid_tenant_ids()
    print("\n✅ Done!")
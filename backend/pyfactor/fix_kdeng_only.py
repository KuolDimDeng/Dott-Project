#!/usr/bin/env python3
"""
Targeted fix for kdeng@dottapps.com tenant issue
"""
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid

# Database connection settings
DB_CONFIG = {
    'host': 'dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com',
    'database': 'dott_production',
    'user': 'dott_user',
    'password': 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ',
    'port': '5432',
    'sslmode': 'require'
}

def fix_kdeng():
    """Fix kdeng@dottapps.com tenant issue"""
    
    try:
        # Connect to the database
        print("🔌 Connecting to production database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check current state
        print("\n📋 Checking kdeng@dottapps.com current state...")
        cur.execute("""
            SELECT 
                u.id as user_id,
                u.email,
                u.tenant_id as user_tenant_id,
                op.id as progress_id,
                op.tenant_id as progress_tenant_id,
                t.id as existing_tenant_id
            FROM custom_auth_user u
            LEFT JOIN onboarding_onboardingprogress op ON op.user_id = u.id
            LEFT JOIN custom_auth_tenant t ON t.owner_id::text = u.id::text
            WHERE u.email = 'kdeng@dottapps.com'
        """)
        
        user_data = cur.fetchone()
        if not user_data:
            print("❌ User kdeng@dottapps.com not found!")
            return
        
        print(f"\nCurrent state:")
        print(f"  User ID: {user_data['user_id']}")
        print(f"  User tenant_id: {user_data['user_tenant_id']}")
        print(f"  Progress tenant_id: {user_data['progress_tenant_id']}")
        print(f"  Existing tenant: {user_data['existing_tenant_id']}")
        
        # Create tenant if it doesn't exist
        if not user_data['existing_tenant_id']:
            print("\n🏢 Creating tenant for kdeng@dottapps.com...")
            tenant_id = str(uuid.uuid4())
            
            cur.execute("""
                INSERT INTO custom_auth_tenant (
                    id, name, owner_id, is_active, rls_enabled, 
                    created_at, updated_at, setup_status
                )
                VALUES (
                    %s, %s, %s, true, true, NOW(), NOW(), 'active'
                )
            """, (tenant_id, "kdeng's Business", str(user_data['user_id'])))
            
            print(f"✅ Created tenant: {tenant_id}")
        else:
            tenant_id = user_data['existing_tenant_id']
            print(f"\n✅ Using existing tenant: {tenant_id}")
        
        # Update OnboardingProgress
        print("\n🔧 Updating OnboardingProgress tenant_id...")
        cur.execute("""
            UPDATE onboarding_onboardingprogress
            SET tenant_id = %s
            WHERE user_id = %s
        """, (tenant_id, user_data['user_id']))
        
        print(f"✅ Updated OnboardingProgress (rows affected: {cur.rowcount})")
        
        # Update User tenant_id
        print("\n🔧 Updating User tenant_id...")
        cur.execute("""
            UPDATE custom_auth_user
            SET tenant_id = %s
            WHERE id = %s
        """, (tenant_id, user_data['user_id']))
        
        print(f"✅ Updated User (rows affected: {cur.rowcount})")
        
        # Verify the fix
        print("\n🔍 Verifying the fix...")
        cur.execute("""
            SELECT 
                u.email,
                u.tenant_id as user_tenant_id,
                op.tenant_id as progress_tenant_id,
                t.id as owned_tenant_id,
                t.name as tenant_name
            FROM custom_auth_user u
            LEFT JOIN onboarding_onboardingprogress op ON op.user_id = u.id
            LEFT JOIN custom_auth_tenant t ON t.id = u.tenant_id
            WHERE u.email = 'kdeng@dottapps.com'
        """)
        
        fixed_data = cur.fetchone()
        print(f"\nFixed state:")
        print(f"  User tenant_id: {fixed_data['user_tenant_id']}")
        print(f"  Progress tenant_id: {fixed_data['progress_tenant_id']}")
        print(f"  Tenant name: {fixed_data['tenant_name']}")
        
        if fixed_data['user_tenant_id'] == fixed_data['progress_tenant_id'] == fixed_data['owned_tenant_id']:
            print("\n✅ All tenant IDs match correctly!")
        else:
            print("\n❌ Tenant IDs still don't match!")
        
        # Commit changes
        print("\n💾 Committing changes...")
        conn.commit()
        print("✅ Changes committed successfully!")
        
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
    print("🚀 Fixing kdeng@dottapps.com tenant issue...")
    print("⚠️  This will modify production data. Press Ctrl+C to cancel or Enter to continue...")
    input()
    fix_kdeng()
    print("\n✅ Done!")
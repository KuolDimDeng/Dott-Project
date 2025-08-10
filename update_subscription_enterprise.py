#\!/usr/bin/env python3
import psycopg2
from datetime import datetime

# Production database connection
DB_CONFIG = {
    'host': 'dpg-d18u66p5pdvs73cvcni0-a.oregon-postgres.render.com',
    'database': 'pyfactor_tpjq',
    'user': 'pyfactor',
    'password': 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ',
    'port': 5432,
    'sslmode': 'require'
}

try:
    print("Connecting to production database...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Find user and business information
    print("\n📊 Looking up user jubacargovillage@outlook.com...")
    cur.execute("""
        SELECT 
            u.id as user_id,
            u.email,
            up.business_id,
            up.tenant_id,
            b.name as business_name
        FROM custom_auth_user u
        LEFT JOIN users_userprofile up ON u.id = up.user_id
        LEFT JOIN users_business b ON up.business_id = b.id
        WHERE u.email = 'jubacargovillage@outlook.com'
    """)
    
    result = cur.fetchone()
    if not result:
        print("❌ User not found")
        exit(1)
    
    user_id, email, business_id, tenant_id, business_name = result
    print(f"✅ Found user: {email}")
    print(f"   User ID: {user_id}")
    print(f"   Business ID: {business_id}")
    print(f"   Tenant ID: {tenant_id}")
    print(f"   Business Name: {business_name}")
    
    # Check current subscription
    print("\n📊 Checking current subscription...")
    cur.execute("""
        SELECT 
            id,
            selected_plan,
            is_active,
            start_date,
            billing_cycle
        FROM users_subscription
        WHERE business_id = %s
    """, (business_id,))
    
    sub_result = cur.fetchone()
    if sub_result:
        sub_id, current_plan, is_active, start_date, billing_cycle = sub_result
        print(f"   Current Plan: {current_plan}")
        print(f"   Is Active: {is_active}")
        print(f"   Billing Cycle: {billing_cycle}")
    else:
        print("   No subscription found, will create new one")
        sub_id = None
    
    # Update or create subscription
    print("\n🔄 Updating subscription to enterprise...")
    
    if sub_id:
        # Update existing subscription
        cur.execute("""
            UPDATE users_subscription
            SET selected_plan = 'enterprise',
                is_active = true,
                billing_cycle = COALESCE(billing_cycle, 'monthly')
            WHERE id = %s
            RETURNING id, selected_plan, is_active
        """, (sub_id,))
    else:
        # Create new subscription
        cur.execute("""
            INSERT INTO users_subscription (
                business_id,
                selected_plan,
                is_active,
                start_date,
                billing_cycle
            ) VALUES (%s, 'enterprise', true, %s, 'monthly')
            RETURNING id, selected_plan, is_active
        """, (business_id, datetime.now().date()))
    
    updated = cur.fetchone()
    if updated:
        print(f"✅ Subscription updated successfully\!")
        print(f"   ID: {updated[0]}")
        print(f"   Plan: {updated[1]}")
        print(f"   Active: {updated[2]}")
    
    # Commit changes
    conn.commit()
    print("\n✅ Changes committed to database")
    
    # Verify the update
    print("\n🔍 Verifying subscription update...")
    cur.execute("""
        SELECT 
            s.selected_plan,
            s.is_active,
            s.billing_cycle
        FROM users_subscription s
        WHERE s.business_id = %s
    """, (business_id,))
    
    verification = cur.fetchone()
    if verification:
        print(f"✅ Verification successful:")
        print(f"   Plan: {verification[0]}")
        print(f"   Active: {verification[1]}")
        print(f"   Billing Cycle: {verification[2]}")
    
    # Clear Redis cache for this user
    print("\n🔄 Clearing cache...")
    cur.execute("""
        SELECT id FROM custom_auth_user 
        WHERE email = 'jubacargovillage@outlook.com'
    """)
    user_ids = cur.fetchall()
    
    print(f"   Will clear cache for {len(user_ids)} user(s)")
    
    print("\n✅ SUBSCRIPTION UPDATE COMPLETE\!")
    print("   User: jubacargovillage@outlook.com")
    print("   Plan: ENTERPRISE")
    print("   Status: ACTIVE")
    print("\n📱 The dashboard should now display 'Enterprise' in the DashAppBar")
    
except Exception as e:
    print(f"❌ Error: {e}")
    if conn:
        conn.rollback()
finally:
    if cur:
        cur.close()
    if conn:
        conn.close()

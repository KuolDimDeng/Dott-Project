#!/usr/bin/env python3
"""
Simple script to convert test user to courier business
Run this on Render shell: python manage.py shell < scripts/simple_courier_convert.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction, connection
from users.models import UserProfile, Business

User = get_user_model()

# Test user email
TEST_EMAIL = "phone_211925550100@dottapps.com"

print("\n" + "="*60)
print("CONVERTING TO COURIER BUSINESS (SIMPLE)")
print("="*60)

with transaction.atomic():
    # Get user
    user = User.objects.filter(email=TEST_EMAIL).first()
    
    if not user:
        print(f"❌ User not found: {TEST_EMAIL}")
        exit(1)
    
    print(f"✅ Found user: {user.email}")
    
    # Check if business exists
    business = Business.objects.filter(owner_id=user.id).first()
    
    if business:
        print(f"\n✅ Business exists: {business.name}")
        print(f"  Current type: {business.business_type}")
        
        # Update using raw SQL to avoid field issues
        with connection.cursor() as cursor:
            # Check which columns exist
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users_business' 
                AND column_name IN ('primary_interaction_type', 'stripe_onboarding_complete')
            """)
            existing_cols = [row[0] for row in cursor.fetchall()]
            has_interaction = 'primary_interaction_type' in existing_cols
            has_stripe = 'stripe_onboarding_complete' in existing_cols
            
            # Build update query
            update_parts = [
                "business_type = 'courier'",
                "simplified_business_type = 'SERVICE'",
                "marketplace_category = 'Transport'",
                "name = 'Steve''s Courier Service'",
                "delivery_scope = 'local'"
            ]
            
            if has_interaction:
                update_parts.append("primary_interaction_type = 'order'")
            
            if has_stripe:
                update_parts.append("stripe_onboarding_complete = false")
            
            update_query = f"""
                UPDATE users_business 
                SET {', '.join(update_parts)}
                WHERE id = %s
            """
            
            cursor.execute(update_query, [str(business.id)])
        
        print(f"✅ Updated business to courier type using SQL")
    else:
        print(f"\n⚠️ No business found, creating courier business...")
        
        # Create with raw SQL to handle field differences
        with connection.cursor() as cursor:
            import uuid
            business_id = str(uuid.uuid4())
            
            # Convert user.id to UUID format (00000000-0000-0000-0000-0000000000XX)
            owner_uuid = f"00000000-0000-0000-0000-{user.id:012x}"
            
            # First check ALL columns and their nullability
            cursor.execute("""
                SELECT column_name, is_nullable 
                FROM information_schema.columns 
                WHERE table_name='users_business'
            """)
            all_columns = {row[0]: row[1] == 'YES' for row in cursor.fetchall()}  # True if nullable
            
            print(f"  Found {len(all_columns)} columns in users_business table")
            
            # Check specifically for our fields
            stripe_fields = ['stripe_onboarding_complete', 'stripe_charges_enabled', 
                           'stripe_payouts_enabled', 'stripe_details_submitted']
            
            print(f"  Checking for Stripe fields...")
            for field in stripe_fields:
                if field in all_columns:
                    nullable = all_columns[field]
                    print(f"    ✓ {field}: {'nullable' if nullable else 'NOT NULL'}")
            
            # Build column list dynamically
            base_cols = ['id', 'owner_id', 'name', 'business_type', 'simplified_business_type',
                        'marketplace_category', 'delivery_scope', 'country', 'city', 'tenant_id']
            base_vals = [business_id, owner_uuid, "Steve's Courier Service", 'courier', 'SERVICE',
                        'Transport', 'local', 'SS', 'Juba', str(user.tenant_id) if user.tenant else None]
            
            # Add primary_interaction_type if it exists
            if 'primary_interaction_type' in all_columns:
                base_cols.append('primary_interaction_type')
                base_vals.append('order')
                print(f"    ✓ primary_interaction_type: added")
            
            # Add ALL Stripe fields that exist, regardless of nullability
            for field in stripe_fields:
                if field in all_columns:
                    base_cols.append(field)
                    base_vals.append(False)
                    print(f"    ✓ {field}: added with value False")
            
            base_cols.extend(['created_at', 'updated_at'])
            
            # Build query
            cols_str = ', '.join(base_cols)
            placeholders = ', '.join(['%s' if c != 'owner_id' else '%s::uuid' for c in base_cols[:-2]] + ['NOW()', 'NOW()'])
            
            cursor.execute(f"""
                INSERT INTO users_business ({cols_str})
                VALUES ({placeholders})
            """, base_vals)
        
        print(f"✅ Created courier business with ID: {business_id}")
        
        # Get the created business
        business = Business.objects.get(id=business_id)
    
    # Update UserProfile
    profile = UserProfile.objects.filter(user=user).first()
    if profile:
        profile.business_id = str(business.id)
        profile.business_name = "Steve's Courier Service"
        profile.business_type = 'courier'
        profile.user_mode = 'business'  # Switch to business mode
        profile.has_business_access = True
        profile.save()
        print(f"✅ Updated UserProfile to business mode")

print("\n" + "="*60)
print("CONVERSION COMPLETE")
print("="*60)
print(f"Business Name: Steve's Courier Service")
print(f"Business Type: courier")
print(f"Category: Transport")
print(f"Mode: Business")
print("\nThe user should now see:")
print("  - Deliveries menu option")
print("  - NO POS or Inventory options")
print("  - Courier-specific features")
print("="*60 + "\n")
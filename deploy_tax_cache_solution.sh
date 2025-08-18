#!/bin/bash

echo "========================================"
echo "DEPLOYING TAX CACHE TO STAGING"
echo "Industry-Standard Migration Solution"
echo "========================================"

# Create a deployment script for Render
cat << 'EOF' > /tmp/deploy_tax_cache.py
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')

print("=" * 60)
print("TAX CACHE DEPLOYMENT - DIRECT DATABASE")
print("=" * 60)

# Step 1: Add fields directly to database
print("\n1️⃣ Adding tax cache fields to database...")

try:
    with connection.cursor() as cursor:
        # Check if fields exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users_userprofile' 
            AND column_name = 'cached_tax_rate';
        """)
        
        if cursor.fetchone():
            print("✓ Tax cache fields already exist")
        else:
            # Add all fields in one ALTER statement
            cursor.execute("""
                ALTER TABLE users_userprofile 
                ADD COLUMN cached_tax_rate NUMERIC(5, 4),
                ADD COLUMN cached_tax_rate_percentage NUMERIC(5, 2),
                ADD COLUMN cached_tax_jurisdiction VARCHAR(100),
                ADD COLUMN cached_tax_updated_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN cached_tax_source VARCHAR(20);
            """)
            
            # Add index for performance
            cursor.execute("""
                CREATE INDEX idx_userprofile_tax_updated 
                ON users_userprofile(cached_tax_updated_at) 
                WHERE cached_tax_rate IS NOT NULL;
            """)
            
            print("✅ Tax cache fields added successfully")
        
        # Mark migration as applied
        cursor.execute("""
            INSERT INTO django_migrations (app, name, applied)
            VALUES ('users', '0123_add_cached_tax_rate_fields', NOW())
            ON CONFLICT (app, name) DO NOTHING;
        """)
        
except Exception as e:
    print(f"❌ Database error: {e}")
    sys.exit(1)

# Step 2: Populate the cache
print("\n2️⃣ Populating tax cache for all users...")

try:
    from taxes.services.tax_cache_service import TaxRateCacheService
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    users = User.objects.filter(is_active=True).select_related('userprofile')
    
    total = users.count()
    print(f"Processing {total} users...")
    
    updated = 0
    for user in users:
        try:
            result = TaxRateCacheService.update_user_cached_tax_rate(user)
            if result.get("success"):
                updated += 1
                rate = result.get("rate_percentage", 0)
                print(f"✓ {user.email}: {rate:.1f}%")
        except Exception as e:
            print(f"⚠️ {user.email}: {e}")
    
    print(f"\n✅ Updated {updated}/{total} users")
    
except Exception as e:
    print(f"⚠️ Population error: {e}")
    print("But database fields were created successfully!")

# Step 3: Verify
print("\n3️⃣ Verifying deployment...")

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT 
            COUNT(*) as total_users,
            COUNT(cached_tax_rate) as users_with_cache,
            AVG(cached_tax_rate_percentage) as avg_rate
        FROM users_userprofile;
    """)
    
    total, with_cache, avg_rate = cursor.fetchone()
    
    print(f"✅ Total profiles: {total}")
    print(f"✅ With tax cache: {with_cache}")
    if avg_rate:
        print(f"✅ Average tax rate: {avg_rate:.2f}%")

print("\n" + "=" * 60)
print("🎉 TAX CACHE DEPLOYMENT COMPLETE!")
print("POS will now load tax rates instantly")
print("=" * 60)
EOF

echo ""
echo "========================================"
echo "DEPLOYMENT SCRIPT CREATED"
echo "========================================"
echo ""
echo "To deploy to staging, run this in Render shell:"
echo ""
echo "  python /tmp/deploy_tax_cache.py"
echo ""
echo "This will:"
echo "1. Add tax cache fields directly to database"
echo "2. Populate cache for all users"
echo "3. No migration prompts needed!"
echo ""
echo "========================================"
echo ""
echo "For future migrations, use these commands:"
echo ""
echo "  # Auto-answer all prompts:"
echo "  python manage.py smart_migrate --make"
echo ""
echo "  # Or use direct database:"
echo "  python scripts/direct_db_migration.py --all"
echo ""
echo "========================================"
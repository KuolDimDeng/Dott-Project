#!/bin/bash

echo "======================================="
echo "Auto-fix Tax Cache in Staging"
echo "======================================="

cat << 'EOF' > /tmp/setup_tax_cache.py
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, migrations
from django.db import models
import logging

logger = logging.getLogger(__name__)

print("=" * 60)
print("SETTING UP TAX CACHE FIELDS")
print("=" * 60)

# Add the fields directly to the database
try:
    with connection.cursor() as cursor:
        # Check if columns already exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users_userprofile' 
            AND column_name = 'cached_tax_rate';
        """)
        
        if not cursor.fetchone():
            print("\n📦 Adding cached tax fields to UserProfile table...")
            
            # Add all the cached tax fields
            cursor.execute("""
                ALTER TABLE users_userprofile 
                ADD COLUMN IF NOT EXISTS cached_tax_rate DECIMAL(5, 4),
                ADD COLUMN IF NOT EXISTS cached_tax_rate_percentage DECIMAL(5, 2),
                ADD COLUMN IF NOT EXISTS cached_tax_jurisdiction VARCHAR(100),
                ADD COLUMN IF NOT EXISTS cached_tax_updated_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS cached_tax_source VARCHAR(20);
            """)
            
            print("✅ Tax cache fields added successfully!")
        else:
            print("✅ Tax cache fields already exist")
            
except Exception as e:
    print(f"❌ Error adding fields: {e}")
    exit(1)

# Now populate the cache
print("\n" + "=" * 60)
print("POPULATING TAX CACHE")
print("=" * 60)

try:
    from taxes.services.tax_cache_service import TaxRateCacheService
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    users = User.objects.filter(is_active=True)
    total = users.count()
    print(f"\nFound {total} users to process")
    
    updated = 0
    failed = 0
    
    for user in users:
        try:
            result = TaxRateCacheService.update_user_cached_tax_rate(user)
            if result.get("success"):
                rate = result.get("rate_percentage", 0)
                jurisdiction = result.get("jurisdiction", "Unknown")
                print(f"✓ {user.email}: {rate:.1f}% - {jurisdiction}")
                updated += 1
            else:
                print(f"✗ {user.email}: {result.get('error', 'Unknown error')}")
                failed += 1
        except Exception as e:
            print(f"✗ {user.email}: {str(e)}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"✅ Successfully updated: {updated}")
    if failed > 0:
        print(f"❌ Failed: {failed}")
    print(f"📊 Total processed: {updated + failed}/{total}")
    
    if updated > 0:
        print("\n🎉 Tax cache system is now active!")
        print("POS will load tax rates instantly.")
        
except Exception as e:
    print(f"\n❌ Error during population: {e}")
    print("But tax cache fields were created successfully.")
    print("You can run 'python manage.py populate_tax_cache' later.")

print("\n" + "=" * 60)
print("SETUP COMPLETE")
print("=" * 60)
EOF

echo ""
echo "Script created at: /tmp/setup_tax_cache.py"
echo ""
echo "======================================="
echo "Run this single command in staging shell:"
echo "======================================="
echo ""
echo "python /tmp/setup_tax_cache.py"
echo ""
echo "This will automatically:"
echo "1. Add the cached tax fields to UserProfile"
echo "2. Populate tax rates for all users"
echo "3. No prompts or migrations needed!"
echo ""
echo "======================================="
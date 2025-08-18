"""
Run this in Django shell after adding the database fields:
python manage.py shell
"""

# Copy and paste this entire block into Django shell:

from taxes.services.tax_cache_service import TaxRateCacheService
from django.contrib.auth import get_user_model
from django.db import connection

User = get_user_model()

# First verify fields exist
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users_userprofile' 
        AND column_name = 'cached_tax_rate'
    """)
    if not cursor.fetchone():
        print("❌ Tax cache fields not found! Run dbshell commands first.")
    else:
        print("✅ Tax cache fields found. Populating...")
        
        # Get all active users
        users = User.objects.filter(is_active=True).select_related('userprofile')
        total = users.count()
        print(f"Processing {total} users...")
        
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
        
        print(f"\n✅ Successfully updated: {updated}")
        if failed > 0:
            print(f"❌ Failed: {failed}")
        print(f"📊 Total processed: {updated + failed}/{total}")
        
        if updated > 0:
            print("\n🎉 Tax cache system is now active!")
            print("POS will load tax rates instantly.")
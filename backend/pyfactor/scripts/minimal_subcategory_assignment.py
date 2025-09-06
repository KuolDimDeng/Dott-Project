"""
Minimal subcategory assignment that only uses existing fields
"""
from django.db import connection

# First check what columns actually exist
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'marketplace_business_listing'
        ORDER BY ordinal_position;
    """)
    columns = cursor.fetchall()
    existing_columns = [col[0] for col in columns]
    print("Existing columns in marketplace_business_listing:")
    for col in existing_columns:
        print(f"  - {col}")

# Check if we have the subcategory fields
has_auto_subcategories = 'auto_subcategories' in existing_columns
has_manual_subcategories = 'manual_subcategories' in existing_columns

if has_auto_subcategories:
    print("\n✓ auto_subcategories field exists")
    
    # Import models only after checking
    from marketplace.models import BusinessListing
    from marketplace.marketplace_categories import detect_subcategories, MARKETPLACE_CATEGORIES
    
    # Use raw SQL to avoid ORM field issues
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, business_id, primary_category, description, search_tags
            FROM marketplace_business_listing
            LIMIT 100
        """)
        listings = cursor.fetchall()
        
    print(f"\nFound {len(listings)} listings to process")
    
    updated = 0
    for listing_id, business_id, primary_cat, description, search_tags in listings:
        # Get business name
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT business_name 
                FROM custom_auth_user 
                WHERE id = %s
            """, [business_id])
            result = cursor.fetchone()
            business_name = result[0] if result else "Unknown"
        
        # Map primary_category to business_type
        business_type = 'OTHER'
        if primary_cat:
            category_map = {
                'food': 'RESTAURANT_CAFE',
                'shopping': 'RETAIL_SHOP',
                'beauty': 'BEAUTY_SALON',
                'health': 'MEDICAL_CLINIC',
                'transport': 'AUTO_SERVICE',
                'services': 'PROFESSIONAL_SERVICE',
            }
            business_type = category_map.get(primary_cat.lower(), 'OTHER')
        
        # Detect subcategories
        subcats = detect_subcategories(
            business_type,
            business_name,
            description or "",
            search_tags or []
        )
        
        if subcats:
            # Update using raw SQL to avoid field issues
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE marketplace_business_listing
                    SET auto_subcategories = %s
                    WHERE id = %s
                """, [subcats, listing_id])
                updated += 1
                print(f"✓ Updated {business_name}: {subcats}")
    
    print(f"\nSuccessfully updated {updated} listings with subcategories")
else:
    print("\n⚠️ auto_subcategories field doesn't exist yet")
    print("Run migrations first: python manage.py makemigrations marketplace && python manage.py migrate marketplace")
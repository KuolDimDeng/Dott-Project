"""
Migration script to convert placeholder businesses to marketplace listings
"""
import os
import sys
import django
from django.db import connection, transaction

# Setup Django
import sys
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from marketplace.marketplace_categories import detect_subcategories

# Comprehensive mapping from placeholder business types to marketplace categories
# This ensures placeholder businesses appear in the correct categories for consumer search
BUSINESS_TYPE_MAPPING = {
    # Food & Dining
    'RESTAURANT_CAFE': {'business_type': 'RESTAURANT_CAFE', 'primary_category': 'food'},
    'RESTAURANT': {'business_type': 'RESTAURANT_CAFE', 'primary_category': 'food'},
    'CAFE': {'business_type': 'RESTAURANT_CAFE', 'primary_category': 'food'},
    'FAST_FOOD': {'business_type': 'RESTAURANT_CAFE', 'primary_category': 'food'},
    'BAKERY': {'business_type': 'RESTAURANT_CAFE', 'primary_category': 'food'},
    'BAR': {'business_type': 'RESTAURANT_CAFE', 'primary_category': 'food'},
    
    # Shopping & Retail
    'RETAIL_SHOP': {'business_type': 'RETAIL_SHOP', 'primary_category': 'shopping'},
    'GROCERY_STORE': {'business_type': 'GROCERY_STORE', 'primary_category': 'shopping'},
    'SUPERMARKET': {'business_type': 'GROCERY_STORE', 'primary_category': 'shopping'},
    'PHARMACY': {'business_type': 'PHARMACY', 'primary_category': 'shopping'},
    'CLOTHING_STORE': {'business_type': 'RETAIL_SHOP', 'primary_category': 'shopping'},
    'ELECTRONICS_STORE': {'business_type': 'RETAIL_SHOP', 'primary_category': 'shopping'},
    
    # Beauty & Personal Care
    'BEAUTY_SALON': {'business_type': 'BEAUTY_SALON', 'primary_category': 'beauty'},
    'BARBER_SHOP': {'business_type': 'BARBER_SHOP', 'primary_category': 'beauty'},
    'SPA': {'business_type': 'BEAUTY_SALON', 'primary_category': 'beauty'},
    'NAIL_SALON': {'business_type': 'BEAUTY_SALON', 'primary_category': 'beauty'},
    
    # Health & Medical
    'MEDICAL_CLINIC': {'business_type': 'MEDICAL_CLINIC', 'primary_category': 'health'},
    'DENTAL_CLINIC': {'business_type': 'DENTAL_CLINIC', 'primary_category': 'health'},
    'HOSPITAL': {'business_type': 'MEDICAL_CLINIC', 'primary_category': 'health'},
    'VETERINARY': {'business_type': 'VETERINARY', 'primary_category': 'health'},
    'FITNESS_CENTER': {'business_type': 'FITNESS_CENTER', 'primary_category': 'health'},
    'GYM': {'business_type': 'FITNESS_CENTER', 'primary_category': 'health'},
    
    # Transport & Automotive
    'AUTO_SERVICE': {'business_type': 'AUTO_SERVICE', 'primary_category': 'transport'},
    'FUEL_STATION': {'business_type': 'OTHER', 'primary_category': 'transport'},
    'GAS_STATION': {'business_type': 'OTHER', 'primary_category': 'transport'},
    'TRANSPORT': {'business_type': 'OTHER', 'primary_category': 'transport'},
    'TAXI_SERVICE': {'business_type': 'OTHER', 'primary_category': 'transport'},
    'CAR_RENTAL': {'business_type': 'AUTO_SERVICE', 'primary_category': 'transport'},
    
    # Services
    'LAUNDRY': {'business_type': 'LAUNDRY', 'primary_category': 'services'},
    'HOTEL': {'business_type': 'HOTEL', 'primary_category': 'services'},
    'EDUCATION': {'business_type': 'EDUCATION', 'primary_category': 'services'},
    'PROFESSIONAL_SERVICE': {'business_type': 'PROFESSIONAL_SERVICE', 'primary_category': 'services'},
    'FINANCIAL_SERVICES': {'business_type': 'PROFESSIONAL_SERVICE', 'primary_category': 'services'},
    'BANK': {'business_type': 'PROFESSIONAL_SERVICE', 'primary_category': 'services'},
    'INSURANCE': {'business_type': 'PROFESSIONAL_SERVICE', 'primary_category': 'services'},
    'REAL_ESTATE': {'business_type': 'PROFESSIONAL_SERVICE', 'primary_category': 'services'},
    
    # Entertainment
    'GAMING_BETTING': {'business_type': 'OTHER', 'primary_category': 'entertainment'},
    'CINEMA': {'business_type': 'OTHER', 'primary_category': 'entertainment'},
    'NIGHTCLUB': {'business_type': 'OTHER', 'primary_category': 'entertainment'},
    'ENTERTAINMENT': {'business_type': 'OTHER', 'primary_category': 'entertainment'},
    
    # Telecom & Tech
    'TELECOM': {'business_type': 'OTHER', 'primary_category': 'services'},
    'MOBILE_MONEY': {'business_type': 'OTHER', 'primary_category': 'services'},
    'INTERNET_CAFE': {'business_type': 'OTHER', 'primary_category': 'services'},
    
    # Default
    'OTHER': {'business_type': 'OTHER', 'primary_category': 'other'},
    'UNKNOWN': {'business_type': 'OTHER', 'primary_category': 'other'},
}

def migrate_placeholder_businesses():
    """Migrate placeholder businesses to marketplace listings"""
    
    with transaction.atomic():
        with connection.cursor() as cursor:
            # First, check what columns exist in marketplace_business_listing
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'marketplace_business_listing'
                ORDER BY ordinal_position;
            """)
            existing_columns = [col[0] for col in cursor.fetchall()]
            print(f"Existing columns in marketplace_business_listing: {existing_columns}")
            
            # Check if subcategory fields exist
            has_auto_subcategories = 'auto_subcategories' in existing_columns
            has_manual_subcategories = 'manual_subcategories' in existing_columns
            has_business_type = 'business_type' in existing_columns
            
            print(f"Has auto_subcategories: {has_auto_subcategories}")
            print(f"Has manual_subcategories: {has_manual_subcategories}")
            print(f"Has business_type: {has_business_type}")
            
            # Get all placeholder businesses
            cursor.execute("""
                SELECT 
                    pb.id,
                    pb.real_business_user_id,
                    pb.name,
                    pb.category,
                    pb.country,
                    pb.city,
                    pb.description,
                    pb.latitude,
                    pb.longitude,
                    pb.phone,
                    pb.email,
                    pb.created_at
                FROM placeholder_businesses pb
                WHERE pb.converted_to_real_business = false
                AND pb.opted_out = false
                ORDER BY pb.created_at
            """)
            
            placeholder_businesses = cursor.fetchall()
            print(f"\nFound {len(placeholder_businesses)} placeholder businesses to migrate")
            
            # Count by type
            type_counts = {}
            for business in placeholder_businesses:
                btype = business[3] or 'OTHER'
                type_counts[btype] = type_counts.get(btype, 0) + 1
            
            print("\nBusiness types to migrate:")
            for btype, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True):
                print(f"  {btype}: {count}")
            
            # Create marketplace listings
            created = 0
            skipped = 0
            errors = []
            
            for pb in placeholder_businesses:
                pb_id, real_user_id, business_name, category_orig, country, city, description, lat, lon, phone, email, created_at = pb
                
                # Placeholder businesses don't have registered users, so we'll link them by placeholder ID
                # We'll store the placeholder_id in the description or search_tags to track it
                
                # Map category to business type
                category_upper = (category_orig or 'OTHER').upper().replace(' ', '_')
                mapping = BUSINESS_TYPE_MAPPING.get(category_upper, BUSINESS_TYPE_MAPPING['OTHER'])
                primary_category = mapping['primary_category']
                business_type = mapping['business_type']
                
                # Detect subcategories
                subcats = detect_subcategories(
                    business_type,
                    business_name or '',
                    description or '',
                    []  # No search tags in placeholder
                )
                
                try:
                    # Build the INSERT query based on available columns
                    columns = [
                        'id', 'business_id', 'primary_category', 
                        'country', 'city', 'description',
                        'latitude', 'longitude', 'is_visible_in_marketplace',
                        'created_at', 'updated_at'
                    ]
                    
                    values = [
                        f"gen_random_uuid()",
                        "%s", "%s", "%s", "%s", "%s", "%s", "%s", 
                        "true", "CURRENT_TIMESTAMP", "CURRENT_TIMESTAMP"
                    ]
                    
                    params = [
                        user_id, primary_category, 
                        country or 'SS', city or 'Juba', description or '',
                        lat, lon
                    ]
                    
                    # Add business_type if it exists
                    if has_business_type:
                        columns.insert(3, 'business_type')
                        values.insert(3, "%s")
                        params.insert(2, business_type)
                    
                    # Add subcategories if they exist
                    if has_auto_subcategories:
                        columns.append('auto_subcategories')
                        values.append("%s")
                        params.append(subcats or [])
                    
                    if has_manual_subcategories:
                        columns.append('manual_subcategories')
                        values.append("%s")
                        params.append([])
                    
                    # Add search tags based on business name and description
                    if 'search_tags' in existing_columns:
                        tags = []
                        if business_name:
                            tags.extend(business_name.lower().split())
                        if description:
                            tags.extend(description.lower().split()[:10])  # First 10 words
                        # Add placeholder tag to identify these businesses
                        tags.append('placeholder')
                        columns.append('search_tags')
                        values.append("%s")
                        params.append(list(set(tags)))  # Unique tags
                    
                    # Mark as unverified placeholder business
                    if 'is_verified' in existing_columns:
                        columns.append('is_verified')
                        values.append("false")
                    
                    # Build and execute the query
                    query = f"""
                        INSERT INTO marketplace_business_listing ({', '.join(columns)})
                        VALUES ({', '.join(values)})
                        ON CONFLICT (business_id) DO NOTHING
                    """
                    
                    cursor.execute(query, params)
                    
                    if cursor.rowcount > 0:
                        created += 1
                        if created % 100 == 0:
                            print(f"  Migrated {created} businesses...")
                    else:
                        skipped += 1
                        
                except Exception as e:
                    errors.append(f"Error migrating {business_name}: {str(e)}")
                    if len(errors) <= 10:
                        print(f"  Error: {errors[-1]}")
            
            print(f"\n✅ Migration complete!")
            print(f"  Created: {created} marketplace listings")
            print(f"  Skipped: {skipped} (already exists or no user_id)")
            print(f"  Errors: {len(errors)}")
            
            if errors and len(errors) > 10:
                print(f"\n  Showing first 10 errors:")
                for err in errors[:10]:
                    print(f"    - {err}")
            
            # Show final counts
            cursor.execute("SELECT COUNT(*) FROM marketplace_business_listing")
            total = cursor.fetchone()[0]
            print(f"\n📊 Total marketplace listings now: {total}")
            
            # Show category distribution
            cursor.execute("""
                SELECT primary_category, COUNT(*) as count
                FROM marketplace_business_listing
                GROUP BY primary_category
                ORDER BY count DESC
            """)
            
            print("\n📍 Category distribution:")
            for cat, count in cursor.fetchall():
                print(f"  {cat}: {count}")
            
            # Show subcategory distribution if field exists
            if has_auto_subcategories:
                cursor.execute("""
                    SELECT unnest(auto_subcategories) as subcat, COUNT(*) as count
                    FROM marketplace_business_listing
                    WHERE auto_subcategories IS NOT NULL AND auto_subcategories != '{}'
                    GROUP BY subcat
                    ORDER BY count DESC
                    LIMIT 20
                """)
                
                subcats = cursor.fetchall()
                if subcats:
                    print("\n🏷️ Top 20 auto-detected subcategories:")
                    for subcat, count in subcats:
                        print(f"  {subcat}: {count}")

if __name__ == "__main__":
    print("🚀 Starting placeholder business migration to marketplace...")
    print("=" * 60)
    migrate_placeholder_businesses()
    print("=" * 60)
    print("✨ Migration script completed!")
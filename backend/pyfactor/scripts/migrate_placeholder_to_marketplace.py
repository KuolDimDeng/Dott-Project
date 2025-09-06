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

# Mapping from placeholder business types to marketplace business types and primary categories
BUSINESS_TYPE_MAPPING = {
    'RESTAURANT_CAFE': {'business_type': 'RESTAURANT_CAFE', 'primary_category': 'food'},
    'RETAIL_SHOP': {'business_type': 'RETAIL_SHOP', 'primary_category': 'shopping'},
    'GROCERY_STORE': {'business_type': 'GROCERY_STORE', 'primary_category': 'shopping'},
    'PHARMACY': {'business_type': 'PHARMACY', 'primary_category': 'health'},
    'BEAUTY_SALON': {'business_type': 'BEAUTY_SALON', 'primary_category': 'beauty'},
    'BARBER_SHOP': {'business_type': 'BARBER_SHOP', 'primary_category': 'beauty'},
    'FITNESS_CENTER': {'business_type': 'FITNESS_CENTER', 'primary_category': 'health'},
    'MEDICAL_CLINIC': {'business_type': 'MEDICAL_CLINIC', 'primary_category': 'health'},
    'DENTAL_CLINIC': {'business_type': 'DENTAL_CLINIC', 'primary_category': 'health'},
    'AUTO_SERVICE': {'business_type': 'AUTO_SERVICE', 'primary_category': 'transport'},
    'LAUNDRY': {'business_type': 'LAUNDRY', 'primary_category': 'services'},
    'HOTEL': {'business_type': 'HOTEL', 'primary_category': 'services'},
    'EDUCATION': {'business_type': 'EDUCATION', 'primary_category': 'services'},
    'PROFESSIONAL_SERVICE': {'business_type': 'PROFESSIONAL_SERVICE', 'primary_category': 'services'},
    'TELECOM': {'business_type': 'OTHER', 'primary_category': 'services'},
    'FUEL_STATION': {'business_type': 'OTHER', 'primary_category': 'transport'},
    'FINANCIAL_SERVICES': {'business_type': 'OTHER', 'primary_category': 'services'},
    'TRANSPORT': {'business_type': 'OTHER', 'primary_category': 'transport'},
    'GAMING_BETTING': {'business_type': 'OTHER', 'primary_category': 'entertainment'},
    'OTHER': {'business_type': 'OTHER', 'primary_category': 'other'},
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
                    pb.user_id,
                    pb.business_name,
                    pb.business_type,
                    pb.country,
                    pb.city,
                    pb.description,
                    pb.latitude,
                    pb.longitude,
                    pb.phone,
                    pb.email,
                    pb.created_at
                FROM placeholder_businesses pb
                WHERE NOT EXISTS (
                    SELECT 1 FROM marketplace_business_listing ml 
                    WHERE ml.business_id = pb.user_id
                )
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
                pb_id, user_id, business_name, business_type_orig, country, city, description, lat, lon, phone, email, created_at = pb
                
                # Skip if user_id is None
                if not user_id:
                    skipped += 1
                    continue
                
                # Map business type
                business_type_orig = business_type_orig or 'OTHER'
                mapping = BUSINESS_TYPE_MAPPING.get(business_type_orig, BUSINESS_TYPE_MAPPING['OTHER'])
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
                        columns.append('search_tags')
                        values.append("%s")
                        params.append(list(set(tags)))  # Unique tags
                    
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
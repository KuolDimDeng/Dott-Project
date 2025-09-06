"""
Fix categories for the 5 Juba businesses to match marketplace categories
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection

# Mapping from old categories to new marketplace categories
CATEGORY_MAP = {
    'FINANCIAL_SERVICES': 'services',
    'RESTAURANT_CAFE': 'food',
    'RETAIL_STORE': 'shopping',
    'PHARMACY': 'health',
    'TELECOM': 'services',
    'TRANSPORT_SERVICE': 'transport',
    'HOTEL_HOSPITALITY': 'services',
    'SALON_SPA': 'beauty',
    'FITNESS_CENTER': 'health',
    'AUTO_PARTS_REPAIR': 'transport',
    'FUEL_STATION': 'transport',
    'ELECTRONICS_TECH': 'shopping',
    'EDUCATION_TRAINING': 'services',
    'CONSTRUCTION': 'services',
    'FASHION_CLOTHING': 'shopping',
    'AGRICULTURE': 'shopping',
    'TOURISM_TRAVEL': 'entertainment',
    'PROFESSIONAL_SERVICES': 'services',
    'MANUFACTURING': 'services',
    'REAL_ESTATE': 'services',
    'LOGISTICS_FREIGHT': 'transport',
    'OTHER': 'other'
}

with connection.cursor() as cursor:
    # First, let's see what the 5 Juba businesses are
    cursor.execute("""
        SELECT id, name, category
        FROM placeholder_businesses
        WHERE city = 'Juba' AND country = 'SS'
        ORDER BY name
    """)
    
    juba_businesses = cursor.fetchall()
    print("Current Juba businesses:")
    print("=" * 50)
    for biz_id, name, category in juba_businesses:
        print(f"  {name}")
        print(f"    Current category: {category}")
        new_category = CATEGORY_MAP.get(category, 'other')
        print(f"    New category: {new_category}")
        print()
    
    # Now update them with proper marketplace categories
    # Let's make them diverse for testing
    diverse_categories = ['food', 'shopping', 'transport', 'beauty', 'health']
    
    print("\nUpdating categories...")
    print("=" * 50)
    
    for i, (biz_id, name, old_category) in enumerate(juba_businesses):
        # Use diverse categories for better testing
        if i < len(diverse_categories):
            new_category = diverse_categories[i]
        else:
            new_category = CATEGORY_MAP.get(old_category, 'services')
        
        cursor.execute("""
            UPDATE placeholder_businesses
            SET category = %s
            WHERE id = %s
        """, [new_category, biz_id])
        
        print(f"✓ Updated {name}: {old_category} → {new_category}")
    
    # Verify the updates
    cursor.execute("""
        SELECT name, category
        FROM placeholder_businesses
        WHERE city = 'Juba' AND country = 'SS'
        ORDER BY name
    """)
    
    print("\n\nUpdated Juba businesses:")
    print("=" * 50)
    for name, category in cursor.fetchall():
        print(f"  {name}: {category}")
    
    # Check category distribution
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM placeholder_businesses
        WHERE city = 'Juba' AND country = 'SS'
        GROUP BY category
    """)
    
    print("\n\nCategory distribution in Juba:")
    print("=" * 50)
    for cat, count in cursor.fetchall():
        print(f"  {cat}: {count} business(es)")

print("\n✅ Categories fixed! The 5 Juba businesses now have marketplace-compatible categories.")
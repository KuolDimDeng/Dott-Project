"""
Fix Juba business categories with PROPER logical mappings
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection

# PROPER category mappings based on business type
PROPER_MAPPINGS = {
    'Custom Market Traders': 'shopping',        # Market = Shopping
    'Juba Teaching Hospital Pharmacy': 'health', # Pharmacy = Health
    'Juba Town Pharmacy': 'health',             # Pharmacy = Health
    'Konyo Konyo Market': 'shopping',           # Market = Shopping
    'Nile Commercial Bank': 'services',         # Bank = Services
}

with connection.cursor() as cursor:
    print("Fixing Juba business categories with PROPER mappings:")
    print("=" * 60)
    
    # Get current state
    cursor.execute("""
        SELECT id, name, category
        FROM placeholder_businesses
        WHERE city = 'Juba' AND country = 'SS'
        ORDER BY name
    """)
    
    businesses = cursor.fetchall()
    
    print("\nCurrent (wrong) mappings:")
    for biz_id, name, current_cat in businesses:
        print(f"  {name}: {current_cat} ❌")
    
    print("\n\nApplying correct mappings:")
    print("-" * 40)
    
    # Update each business with the correct category
    for biz_id, name, old_cat in businesses:
        new_category = PROPER_MAPPINGS.get(name, 'services')
        
        cursor.execute("""
            UPDATE placeholder_businesses
            SET category = %s
            WHERE id = %s
        """, [new_category, biz_id])
        
        print(f"✓ {name}")
        print(f"  Was: {old_cat} → Now: {new_category}")
    
    # Verify the updates
    cursor.execute("""
        SELECT name, category
        FROM placeholder_businesses
        WHERE city = 'Juba' AND country = 'SS'
        ORDER BY name
    """)
    
    print("\n\nFinal correct mappings:")
    print("=" * 60)
    for name, category in cursor.fetchall():
        icon = {
            'shopping': '🛒',
            'health': '🏥',
            'services': '🏦',
            'food': '🍔',
            'transport': '🚗',
            'beauty': '💅',
            'entertainment': '🎮',
            'other': '📦'
        }.get(category, '❓')
        print(f"  {icon} {name}: {category}")
    
    # Show category distribution
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM placeholder_businesses
        WHERE city = 'Juba' AND country = 'SS'
        GROUP BY category
        ORDER BY count DESC
    """)
    
    print("\n\nCategory distribution in Juba:")
    print("-" * 40)
    for cat, count in cursor.fetchall():
        print(f"  {cat}: {count} business(es)")

print("\n✅ Categories fixed with logical mappings!")
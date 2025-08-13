#!/bin/bash

echo "🔍 Verifying and fixing duplicate SKU issue..."
echo ""
echo "Run these commands on the production backend to verify and fix:"
echo ""
echo "1. First, check the current state:"
echo "python manage.py shell"
echo ""

cat << 'EOF'
from inventory.models import Product
from users.models import User

# Find user
user = User.objects.filter(email='kuoldimdeng@outlook.com').first()
print(f"User: {user.email if user else 'Not found'}")

if user and user.tenant_id:
    # Get all products for this user
    products = Product.objects.filter(tenant_id=user.tenant_id).order_by('created_at')
    print(f"\nAll products for tenant {user.tenant_id}:")
    for p in products:
        print(f"  ID: {p.id}")
        print(f"  Name: {p.name}")
        print(f"  SKU: {p.sku}")
        print(f"  Created: {p.created_at}")
        print("  ---")
    
    # Find duplicates
    duplicates = Product.objects.filter(
        tenant_id=user.tenant_id,
        sku='Test1234545'
    ).order_by('created_at')
    
    print(f"\nFound {duplicates.count()} products with SKU 'Test1234545'")
    
    if duplicates.count() >= 2:
        # Update ALL duplicates after the first one
        for i, product in enumerate(duplicates):
            if i > 0:  # Skip the first one
                new_sku = f"Test1234545{i+5}"  # Will be Test12345456, Test12345457, etc.
                print(f"\nUpdating product {i+1}:")
                print(f"  Product: {product.name} (ID: {product.id})")
                print(f"  Old SKU: {product.sku}")
                print(f"  New SKU: {new_sku}")
                product.sku = new_sku
                product.save()
                print(f"  ✅ Updated!")
    
    # Verify the fix
    print("\n=== AFTER FIX ===")
    products = Product.objects.filter(tenant_id=user.tenant_id).order_by('created_at')
    for p in products:
        print(f"  {p.name}: SKU={p.sku}")

# Clear any cache
from django.core.cache import cache
cache.clear()
print("\n✅ Cache cleared")

exit()
EOF

echo ""
echo "2. If the products still show duplicate SKUs, run this SQL directly:"
echo "python manage.py dbshell"
echo ""

cat << 'EOF'
-- Check current state
SELECT id, name, sku, created_at 
FROM inventory_product 
WHERE tenant_id = (
    SELECT tenant_id FROM users_user WHERE email = 'kuoldimdeng@outlook.com'
)
ORDER BY created_at;

-- Force update the duplicate SKUs with unique values
WITH numbered_products AS (
    SELECT 
        id,
        sku,
        ROW_NUMBER() OVER (PARTITION BY sku ORDER BY created_at) as row_num
    FROM inventory_product 
    WHERE tenant_id = (
        SELECT tenant_id FROM users_user WHERE email = 'kuoldimdeng@outlook.com'
    )
    AND sku = 'Test1234545'
)
UPDATE inventory_product 
SET sku = CASE 
    WHEN np.row_num = 2 THEN 'Test12345456'
    WHEN np.row_num = 3 THEN 'Test12345457'
    ELSE sku
END
FROM numbered_products np
WHERE inventory_product.id = np.id
AND np.row_num > 1;

-- Verify the fix
SELECT id, name, sku, created_at 
FROM inventory_product 
WHERE tenant_id = (
    SELECT tenant_id FROM users_user WHERE email = 'kuoldimdeng@outlook.com'
)
ORDER BY created_at;

\q
EOF

echo ""
echo "3. After fixing, clear Redis cache:"
echo "python manage.py shell"
echo ""
cat << 'EOF'
import redis
from django.conf import settings

# Clear Redis cache
try:
    r = redis.from_url(settings.REDIS_URL)
    r.flushdb()
    print("✅ Redis cache cleared")
except Exception as e:
    print(f"Error clearing Redis: {e}")

exit()
EOF
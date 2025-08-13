#!/bin/bash

echo "🔧 Fixing duplicate SKU for Test products..."
echo ""
echo "This script will add '6' to the SKU of the second Test product"
echo "User: kuoldimdeng@outlook.com"
echo "Duplicate SKU: Test1234545"
echo ""
echo "Run this command on the production backend:"
echo ""
echo "python manage.py fix_duplicate_sku"
echo ""
echo "Or run this SQL directly in the database:"
echo ""

cat << 'EOF'
-- First, identify the duplicate products
SELECT id, name, sku, created_at 
FROM inventory_product 
WHERE tenant_id = (
    SELECT tenant_id FROM users_user WHERE email = 'kuoldimdeng@outlook.com'
)
AND sku = 'Test1234545'
ORDER BY created_at;

-- Update the second product's SKU (modify the ID based on the above query)
UPDATE inventory_product 
SET sku = 'Test12345456'
WHERE tenant_id = (
    SELECT tenant_id FROM users_user WHERE email = 'kuoldimdeng@outlook.com'
)
AND sku = 'Test1234545'
AND id = (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
        FROM inventory_product 
        WHERE tenant_id = (
            SELECT tenant_id FROM users_user WHERE email = 'kuoldimdeng@outlook.com'
        )
        AND sku = 'Test1234545'
    ) t
    WHERE row_num = 2
);

-- Verify the fix
SELECT id, name, sku, created_at 
FROM inventory_product 
WHERE tenant_id = (
    SELECT tenant_id FROM users_user WHERE email = 'kuoldimdeng@outlook.com'
)
ORDER BY created_at;
EOF
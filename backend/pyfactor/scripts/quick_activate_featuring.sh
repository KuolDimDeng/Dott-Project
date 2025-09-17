#!/bin/bash

# Quick activation script for featuring system
# This can be run directly on the server to enable featured items

echo "🚀 Quick Activation of Featuring System..."
echo ""
echo "📝 Run these SQL commands directly in the database if migrations fail:"
echo ""
cat << 'SQL'
-- Add featuring fields to menu_items table if they don't exist
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP NULL;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS featured_priority INTEGER DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS featured_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add featuring fields to inventory_product table if they don't exist
ALTER TABLE inventory_product ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory_product ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP NULL;
ALTER TABLE inventory_product ADD COLUMN IF NOT EXISTS featured_priority INTEGER DEFAULT 0;
ALTER TABLE inventory_product ADD COLUMN IF NOT EXISTS featured_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE inventory_product ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE inventory_product ADD COLUMN IF NOT EXISTS order_count INTEGER DEFAULT 0;

-- Set some items as featured for testing (adjust business IDs as needed)
UPDATE menu_items
SET is_featured = true, featured_priority = 10
WHERE tenant_id IN (SELECT id FROM users_user WHERE has_business = true)
LIMIT 5;

UPDATE inventory_product
SET is_featured = true, featured_priority = 10
WHERE tenant_id IN (SELECT id FROM users_user WHERE has_business = true)
LIMIT 5;
SQL

echo ""
echo "✅ You can run these SQL commands directly in PostgreSQL to add the fields"
echo ""
echo "📦 Alternative: Try running migrations in this order:"
echo "1. python manage.py migrate couriers --fake-initial"
echo "2. python manage.py migrate marketplace"
echo "3. python manage.py migrate menu"
echo "4. python manage.py migrate inventory"

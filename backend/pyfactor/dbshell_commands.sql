-- Fix JSON issue and add missing delivery_pin column
-- Run these commands in the Render shell

-- 1. First check the table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'marketplace_consumer_orders'
ORDER BY ordinal_position;

-- 2. Add missing delivery_pin column if it doesn't exist
ALTER TABLE marketplace_consumer_orders
ADD COLUMN IF NOT EXISTS delivery_pin VARCHAR(6) DEFAULT '';

-- 3. Fix JSON column default for items
ALTER TABLE marketplace_consumer_orders
ALTER COLUMN items SET DEFAULT '[]'::json;

-- 4. Fix any existing rows with invalid JSON
UPDATE marketplace_consumer_orders
SET items = '[]'::json
WHERE items IS NULL
OR items::text = ''
OR items::text = '""';

-- 5. Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'marketplace_consumer_orders'
AND column_name IN ('service_fee', 'pickup_pin', 'consumer_delivery_pin', 'delivery_pin', 'items')
ORDER BY column_name;
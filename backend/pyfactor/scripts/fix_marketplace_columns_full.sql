-- Complete SQL to fix marketplace_business_listing table
-- Run this entire script in Render dbshell

-- Connect to your database (if not already connected)
-- \c your_database_name

-- Add all missing columns in a single ALTER TABLE statement
ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS payment_methods varchar(50)[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS delivery_options jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS operating_hours jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS social_media jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS features varchar(100)[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags varchar(50)[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rating decimal(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- Update any existing businesses with default delivery options
UPDATE marketplace_business_listing
SET delivery_options = '{"delivery": false, "pickup": true, "shipping": false}'::jsonb
WHERE delivery_options = '{}' OR delivery_options IS NULL;

-- Update any existing businesses with default payment methods
UPDATE marketplace_business_listing
SET payment_methods = ARRAY['cash']::varchar(50)[]
WHERE payment_methods = '{}' OR payment_methods IS NULL;

-- Update any existing businesses with default operating hours
UPDATE marketplace_business_listing
SET operating_hours = '{
  "monday": {"open": "09:00", "close": "17:00", "is_closed": false},
  "tuesday": {"open": "09:00", "close": "17:00", "is_closed": false},
  "wednesday": {"open": "09:00", "close": "17:00", "is_closed": false},
  "thursday": {"open": "09:00", "close": "17:00", "is_closed": false},
  "friday": {"open": "09:00", "close": "17:00", "is_closed": false},
  "saturday": {"open": "09:00", "close": "17:00", "is_closed": false},
  "sunday": {"open": "09:00", "close": "17:00", "is_closed": true}
}'::jsonb
WHERE operating_hours = '{}' OR operating_hours IS NULL;

-- Verify the columns were added successfully
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'marketplace_business_listing'
AND column_name IN (
    'payment_methods',
    'delivery_options',
    'operating_hours',
    'social_media',
    'features',
    'tags',
    'rating',
    'review_count'
)
ORDER BY column_name;

-- Check if we have any businesses and their new fields
SELECT
    id,
    business_name,
    is_visible_in_marketplace,
    payment_methods,
    delivery_options
FROM marketplace_business_listing
LIMIT 5;

-- Show total count of businesses
SELECT COUNT(*) as total_businesses FROM marketplace_business_listing;
SELECT COUNT(*) as visible_businesses FROM marketplace_business_listing WHERE is_visible_in_marketplace = true;
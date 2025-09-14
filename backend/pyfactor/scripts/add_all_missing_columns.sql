-- Add ALL missing columns to marketplace_business_listing table
-- Run this complete script in Render dbshell

ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS business_email varchar(254),
ADD COLUMN IF NOT EXISTS postal_code varchar(20),
ADD COLUMN IF NOT EXISTS phone varchar(30),
ADD COLUMN IF NOT EXISTS website varchar(200),
ADD COLUMN IF NOT EXISTS address text;

-- Set default values for existing records
UPDATE marketplace_business_listing
SET business_email = 'support@dottapps.com'
WHERE business_email IS NULL;

UPDATE marketplace_business_listing
SET phone = '+211 123 456 789'
WHERE phone IS NULL;

UPDATE marketplace_business_listing
SET address = 'Juba, South Sudan'
WHERE address IS NULL;

-- Verify all columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'marketplace_business_listing'
AND column_name IN (
    'business_email',
    'postal_code',
    'phone',
    'website',
    'address',
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
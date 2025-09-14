-- Add missing business_email column to marketplace_business_listing table
ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS business_email varchar(254);

-- Set default email for existing records (optional)
UPDATE marketplace_business_listing
SET business_email = 'support@dottapps.com'
WHERE business_email IS NULL;

-- Verify column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'marketplace_business_listing'
AND column_name = 'business_email';
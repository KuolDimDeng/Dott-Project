-- Add manual_override fields to marketplace_business_listing table
-- This allows businesses to manually override their open/closed status

-- Add manual_override field (boolean)
ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT FALSE;

-- Add manual_override_expires field (timestamp)
ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS manual_override_expires TIMESTAMPTZ NULL;

-- Add comments to explain the fields
COMMENT ON COLUMN marketplace_business_listing.manual_override
IS 'Whether the business open/closed status is manually overridden by the owner';

COMMENT ON COLUMN marketplace_business_listing.manual_override_expires
IS 'When the manual override expires (typically 24 hours after being set)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'marketplace_business_listing'
AND column_name IN ('manual_override', 'manual_override_expires');
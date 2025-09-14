-- Add missing columns to marketplace_business_listing table
-- Run this in Render dbshell if migration hasn't been applied yet

-- Add payment_methods column (array of varchar)
ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS payment_methods varchar(50)[] DEFAULT '{}';

-- Add delivery_options column (JSONB)
ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS delivery_options jsonb DEFAULT '{}';

-- Add operating_hours column (JSONB)
ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS operating_hours jsonb DEFAULT '{}';

-- Add social_media column (JSONB)
ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS social_media jsonb DEFAULT '{}';

-- Add features column (array of varchar)
ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS features varchar(100)[] DEFAULT '{}';

-- Add tags column (array of varchar)
ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS tags varchar(50)[] DEFAULT '{}';

-- Add rating column
ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS rating decimal(3,2) DEFAULT 0.00;

-- Add review_count column
ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'marketplace_business_listing'
AND column_name IN ('payment_methods', 'delivery_options', 'operating_hours', 'social_media', 'features', 'tags', 'rating', 'review_count');
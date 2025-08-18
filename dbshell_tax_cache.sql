-- TAX CACHE FIELDS - Direct Database Setup
-- Run this in Django dbshell: python manage.py dbshell

-- Step 1: Check if fields already exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users_userprofile' 
AND column_name LIKE 'cached_tax%';

-- Step 2: Add tax cache fields if they don't exist
ALTER TABLE users_userprofile 
ADD COLUMN IF NOT EXISTS cached_tax_rate NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS cached_tax_rate_percentage NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS cached_tax_jurisdiction VARCHAR(100),
ADD COLUMN IF NOT EXISTS cached_tax_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cached_tax_source VARCHAR(20);

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_userprofile_tax_updated 
ON users_userprofile(cached_tax_updated_at) 
WHERE cached_tax_rate IS NOT NULL;

-- Step 4: Mark migration as applied in Django
INSERT INTO django_migrations (app, name, applied)
VALUES ('users', '0123_add_cached_tax_rate_fields', NOW())
ON CONFLICT (app, name) DO NOTHING;

-- Step 5: Verify fields were added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users_userprofile' 
AND column_name LIKE 'cached_tax%'
ORDER BY ordinal_position;

-- Step 6: Check statistics
SELECT 
    COUNT(*) as total_profiles,
    COUNT(cached_tax_rate) as profiles_with_cache,
    AVG(cached_tax_rate_percentage) as avg_tax_rate
FROM users_userprofile;

-- Success! Fields are ready for population
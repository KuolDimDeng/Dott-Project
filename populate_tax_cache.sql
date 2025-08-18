-- POPULATE TAX CACHE DIRECTLY IN SQL
-- Run this in dbshell: python manage.py dbshell

-- Step 1: Update tax cache from GlobalSalesTaxRate based on business location
UPDATE users_userprofile up
SET 
    cached_tax_rate = gst.rate / 100.0,
    cached_tax_rate_percentage = gst.rate,
    cached_tax_jurisdiction = COALESCE(
        CASE 
            WHEN b.county IS NOT NULL AND b.county != '' THEN b.county || ', ' || b.state || ', ' || b.country
            WHEN b.state IS NOT NULL AND b.state != '' THEN b.state || ', ' || b.country
            ELSE b.country
        END,
        'Unknown'
    ),
    cached_tax_updated_at = NOW(),
    cached_tax_source = 'global'
FROM 
    auth_user u
    LEFT JOIN users_business b ON b.tenant_id = u.tenant_id
    LEFT JOIN taxes_globalsalestaxrate gst ON (
        -- Try exact match first (country + state + county)
        (gst.country = b.country AND 
         gst.state = b.state AND 
         gst.county = b.county AND
         gst.city IS NULL)
        OR
        -- Then try state level
        (gst.country = b.country AND 
         gst.state = b.state AND 
         gst.county IS NULL AND
         gst.city IS NULL)
        OR
        -- Finally country level
        (gst.country = b.country AND 
         gst.state IS NULL AND 
         gst.county IS NULL AND
         gst.city IS NULL)
    )
WHERE 
    up.user_id = u.id
    AND u.is_active = true
    AND b.id IS NOT NULL
    AND gst.id IS NOT NULL;

-- Step 2: Check how many were updated
SELECT 
    COUNT(*) as total_profiles,
    COUNT(cached_tax_rate) as profiles_with_cache,
    ROUND(AVG(cached_tax_rate_percentage), 2) as avg_tax_rate
FROM users_userprofile;

-- Step 3: Show sample of updated records
SELECT 
    u.email,
    up.cached_tax_rate_percentage as tax_rate,
    up.cached_tax_jurisdiction as jurisdiction,
    up.cached_tax_source as source
FROM 
    users_userprofile up
    JOIN auth_user u ON u.id = up.user_id
WHERE 
    up.cached_tax_rate IS NOT NULL
LIMIT 10;

-- Step 4: For users without business or tax rate, set to 0
UPDATE users_userprofile up
SET 
    cached_tax_rate = 0,
    cached_tax_rate_percentage = 0,
    cached_tax_jurisdiction = 'No Business Location',
    cached_tax_updated_at = NOW(),
    cached_tax_source = 'default'
WHERE 
    cached_tax_rate IS NULL
    AND EXISTS (
        SELECT 1 FROM auth_user u 
        WHERE u.id = up.user_id 
        AND u.is_active = true
    );

-- Final check
SELECT 
    'Total Users' as metric,
    COUNT(*) as count
FROM auth_user WHERE is_active = true
UNION ALL
SELECT 
    'Users with Tax Cache' as metric,
    COUNT(*) as count
FROM users_userprofile WHERE cached_tax_rate IS NOT NULL
UNION ALL
SELECT 
    'Average Tax Rate (%)' as metric,
    ROUND(AVG(cached_tax_rate_percentage), 2) as count
FROM users_userprofile WHERE cached_tax_rate > 0;
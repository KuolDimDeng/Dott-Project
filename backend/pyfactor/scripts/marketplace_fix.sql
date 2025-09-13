-- Fix Marketplace Display Issues
-- ================================

-- 1. Check current state
SELECT 'Current User State:' as info;
SELECT u.id, u.email, u.name, t.name as tenant_name 
FROM custom_auth_user u
LEFT JOIN custom_auth_tenant t ON u.tenant_id = t.id
WHERE u.email = 'support@dottapps.com';

-- 2. Create marketplace_businesslisting table if it doesn't exist
CREATE TABLE IF NOT EXISTS marketplace_businesslisting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id INTEGER REFERENCES custom_auth_user(id),
    business_type VARCHAR(50),
    secondary_categories TEXT[],
    delivery_scope VARCHAR(20) DEFAULT 'local',
    delivery_radius_km INTEGER DEFAULT 10,
    ships_to_countries TEXT[],
    is_digital_only BOOLEAN DEFAULT FALSE,
    country VARCHAR(2),
    city VARCHAR(100),
    latitude FLOAT,
    longitude FLOAT,
    is_visible_in_marketplace BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    featured_until DATE,
    business_hours JSONB DEFAULT '{}',
    is_open_now BOOLEAN DEFAULT TRUE,
    search_tags TEXT[],
    description TEXT,
    logo_url VARCHAR(500),
    logo_public_id VARCHAR(255),
    cover_image_url VARCHAR(500),
    cover_image_public_id VARCHAR(255),
    gallery_images JSONB DEFAULT '[]',
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    average_response_time INTEGER,
    response_rate DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insert or update marketplace listing for support@dottapps.com
INSERT INTO marketplace_businesslisting (
    business_id,
    business_type,
    country,
    city,
    is_visible_in_marketplace,
    is_verified,
    description
)
SELECT 
    u.id,
    'RESTAURANT_CAFE',
    'SS',
    'Juba',
    true,
    true,
    'Premium restaurant and cafe offering delicious food and beverages'
FROM custom_auth_user u
WHERE u.email = 'support@dottapps.com'
ON CONFLICT (business_id) 
DO UPDATE SET
    business_type = 'RESTAURANT_CAFE',
    country = 'SS',
    city = 'Juba',
    is_visible_in_marketplace = true,
    is_verified = true,
    description = 'Premium restaurant and cafe offering delicious food and beverages',
    updated_at = NOW();

-- 4. Check if images exist in users_business_details and copy them
UPDATE marketplace_businesslisting ml
SET 
    logo_url = bd.logo_cloudinary_url,
    cover_image_url = bd.logo_cloudinary_url
FROM users_business_details bd
WHERE bd.business_id = (
    SELECT up.business_id 
    FROM users_userprofile up 
    WHERE up.user_id = ml.business_id
)
AND ml.business_id = (SELECT id FROM custom_auth_user WHERE email = 'support@dottapps.com');

-- 5. Verify the fix
SELECT 'Final State:' as info;
SELECT 
    u.email,
    u.name as user_name,
    t.name as tenant_name,
    ml.business_type,
    ml.is_visible_in_marketplace,
    ml.city,
    ml.country,
    ml.logo_url,
    ml.cover_image_url
FROM custom_auth_user u
LEFT JOIN custom_auth_tenant t ON u.tenant_id = t.id
LEFT JOIN marketplace_businesslisting ml ON u.id = ml.business_id
WHERE u.email = 'support@dottapps.com';
-- Final SQL to add ALL missing columns including state
-- Run this in Render dbshell

ALTER TABLE marketplace_business_listing
ADD COLUMN IF NOT EXISTS state varchar(100);

-- Set default value for state
UPDATE marketplace_business_listing
SET state = 'Central Equatoria'
WHERE state IS NULL;

-- Verify all columns now exist
SELECT COUNT(*) as missing_columns
FROM (VALUES
    ('business_email'),
    ('postal_code'),
    ('phone'),
    ('website'),
    ('address'),
    ('state'),
    ('payment_methods'),
    ('delivery_options'),
    ('operating_hours'),
    ('social_media'),
    ('features'),
    ('tags'),
    ('rating'),
    ('review_count')
) AS required(column_name)
LEFT JOIN information_schema.columns ic
    ON ic.table_name = 'marketplace_business_listing'
    AND ic.column_name = required.column_name
WHERE ic.column_name IS NULL;
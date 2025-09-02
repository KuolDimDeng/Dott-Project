-- SQL script to add optional fields to placeholder_businesses table
-- Run this in your database to add the new columns

-- Add email field
ALTER TABLE placeholder_businesses 
ADD COLUMN IF NOT EXISTS email VARCHAR(254) DEFAULT NULL;

-- Add description field
ALTER TABLE placeholder_businesses 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- Add image_url field
ALTER TABLE placeholder_businesses 
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL;

-- Add logo_url field
ALTER TABLE placeholder_businesses 
ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500) DEFAULT NULL;

-- Add website field
ALTER TABLE placeholder_businesses 
ADD COLUMN IF NOT EXISTS website VARCHAR(255) DEFAULT NULL;

-- Add opening_hours field (as JSON)
ALTER TABLE placeholder_businesses 
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT NULL;

-- Add rating field
ALTER TABLE placeholder_businesses 
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT NULL;

-- Add social_media field (as JSON)
ALTER TABLE placeholder_businesses 
ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT NULL;

-- Add check constraint for rating to ensure it's between 1 and 5
ALTER TABLE placeholder_businesses 
ADD CONSTRAINT check_rating_range 
CHECK (rating IS NULL OR (rating >= 1.00 AND rating <= 5.00));

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_placeholder_email ON placeholder_businesses(email);
CREATE INDEX IF NOT EXISTS idx_placeholder_website ON placeholder_businesses(website);
CREATE INDEX IF NOT EXISTS idx_placeholder_rating ON placeholder_businesses(rating);

-- Show the updated table structure
\d placeholder_businesses;
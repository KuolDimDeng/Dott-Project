-- Fix UserProfile user_id field type mismatch
-- This script converts user_id from UUID to integer to match User.id type

BEGIN;

-- First, check the current schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users_userprofile' 
AND column_name = 'user_id';

-- Drop the foreign key constraint if it exists
ALTER TABLE users_userprofile 
DROP CONSTRAINT IF EXISTS users_userprofile_user_id_fkey;

-- Convert user_id from UUID to integer
-- This assumes the UUID values can be converted or are actually integers stored as UUIDs
ALTER TABLE users_userprofile 
ALTER COLUMN user_id TYPE integer USING user_id::text::integer;

-- Re-add the foreign key constraint
ALTER TABLE users_userprofile 
ADD CONSTRAINT users_userprofile_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES custom_auth_user(id) 
ON DELETE CASCADE;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users_userprofile' 
AND column_name = 'user_id';

COMMIT;
-- Add phone_number column to custom_auth_user table
ALTER TABLE custom_auth_user 
ADD COLUMN phone_number VARCHAR(20) NULL; 
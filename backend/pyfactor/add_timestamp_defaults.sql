-- Add default values for timestamp columns
ALTER TABLE hr_employeegeofence 
ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE hr_employeegeofence 
ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
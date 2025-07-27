-- Fix EmployeeGeofence assigned_by_id column type mismatch
-- The column is UUID but User model has integer PK

-- First, drop the foreign key constraint
ALTER TABLE hr_employeegeofence 
DROP CONSTRAINT IF EXISTS hr_employeegeofence_assigned_by_id_fkey;

-- Change the column type from UUID to integer
ALTER TABLE hr_employeegeofence 
ALTER COLUMN assigned_by_id TYPE integer USING NULL;

-- Re-add the foreign key constraint
ALTER TABLE hr_employeegeofence 
ADD CONSTRAINT hr_employeegeofence_assigned_by_id_fkey 
FOREIGN KEY (assigned_by_id) 
REFERENCES custom_auth_user(id) 
ON DELETE SET NULL;

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'hr_employeegeofence'
AND column_name = 'assigned_by_id';
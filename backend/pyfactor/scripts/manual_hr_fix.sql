-- Manual SQL script to add missing HR Employee banking and mobile money columns
-- Run this if the Python migration scripts fail

-- Add missing banking and mobile money columns to hr_employee table
ALTER TABLE hr_employee 
ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_number_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS routing_number_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS stripe_bank_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS mobile_money_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS mobile_money_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS prefer_mobile_money BOOLEAN DEFAULT FALSE;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'hr_employee' 
AND column_name IN ('bank_account_name', 'bank_name', 'account_number_last4', 'routing_number_last4', 
                    'stripe_bank_account_id', 'mobile_money_provider', 'mobile_money_number', 'prefer_mobile_money')
ORDER BY column_name;
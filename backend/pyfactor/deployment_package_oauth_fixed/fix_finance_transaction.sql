-- Add the posted_by_id column to finance_financetransaction
ALTER TABLE finance_financetransaction 
ADD COLUMN posted_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL; 
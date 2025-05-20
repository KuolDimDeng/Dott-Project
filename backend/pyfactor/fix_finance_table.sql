-- Rename the finance_transaction table to finance_financetransaction
ALTER TABLE finance_transaction RENAME TO finance_financetransaction;

-- Update the references in django_content_type
UPDATE django_content_type 
SET model = 'financetransaction' 
WHERE app_label = 'finance' AND model = 'transaction'; 
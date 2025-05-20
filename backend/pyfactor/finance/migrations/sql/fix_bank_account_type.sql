
-- Drop the problematic FK constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'finance_accountreconciliation'::regclass
        AND confrelid = 'banking_bankaccount'::regclass
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE finance_accountreconciliation DROP CONSTRAINT ' || conname
            FROM pg_constraint
            WHERE conrelid = 'finance_accountreconciliation'::regclass
            AND confrelid = 'banking_bankaccount'::regclass
            LIMIT 1
        );
    END IF;
END $$;

-- Modify the column type
ALTER TABLE finance_accountreconciliation 
ALTER COLUMN bank_account_id TYPE uuid USING NULL;

-- Add the correct foreign key constraint
ALTER TABLE finance_accountreconciliation 
ADD CONSTRAINT finance_accountrecon_bank_account_id_fk 
FOREIGN KEY (bank_account_id) 
REFERENCES banking_bankaccount(id) DEFERRABLE INITIALLY DEFERRED;
                
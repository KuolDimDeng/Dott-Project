-- Check Production Database for Stripe Configuration Issues

-- 1. Check what payment-related tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%payment%'
ORDER BY table_name;

-- 2. Check what stripe-related columns exist in users_business
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users_business'
AND column_name LIKE '%stripe%';

-- 3. Check if any businesses exist at all
SELECT COUNT(*) as total_businesses,
       COUNT(stripe_account_id) as with_stripe,
       COUNT(CASE WHEN stripe_account_id IS NOT NULL AND stripe_account_id != '' THEN 1 END) as with_valid_stripe
FROM users_business;

-- 4. Check a sample business record
SELECT id, business_name, stripe_account_id, created_at 
FROM users_business 
LIMIT 5;

-- 5. Check if payments_stripeconfiguration exists (alternative table)
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'payments_stripeconfiguration'
) as stripe_config_table_exists;

-- 6. Check all payment provider configurations
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%stripe%' OR table_name LIKE '%payment%')
ORDER BY table_name;

-- 7. Check if there are any payment intents or transactions
SELECT 
    (SELECT COUNT(*) FROM payments_paymentintent) as payment_intents,
    (SELECT COUNT(*) FROM payments_transaction) as transactions,
    (SELECT COUNT(*) FROM pos_possale WHERE payment_method = 'credit_card') as credit_card_sales;

-- 8. Check environment-specific settings that might exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%config%'
ORDER BY table_name;
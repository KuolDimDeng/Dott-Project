-- Check the structure of the onboarding_onboardingprogress table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'onboarding_onboardingprogress' 
ORDER BY ordinal_position;

-- Check indexes on the table
SELECT 
    i.relname as index_name,
    a.attname as column_name
FROM
    pg_class t,
    pg_class i,
    pg_index ix,
    pg_attribute a
WHERE
    t.oid = ix.indrelid
    and i.oid = ix.indexrelid
    and a.attrelid = t.oid
    and a.attnum = ANY(ix.indkey)
    and t.relkind = 'r'
    and t.relname = 'onboarding_onboardingprogress'
ORDER BY
    t.relname,
    i.relname; 
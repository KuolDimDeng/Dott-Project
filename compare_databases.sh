#!/bin/bash

echo "========================================"
echo "Database Schema Comparison Tool"
echo "Compare Staging vs Production Databases"
echo "========================================"

cat << 'EOF' > /tmp/compare_db_schema.sql
-- Get all tables and their columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Get all indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Get all foreign keys
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- Check migrations status
SELECT app, name, applied 
FROM django_migrations 
ORDER BY app, applied DESC;

-- Check for missing columns that might cause errors
SELECT 
    'users_userprofile' as table_name,
    COUNT(*) FILTER (WHERE column_name = 'cached_tax_rate') as has_tax_cache,
    COUNT(*) FILTER (WHERE column_name = 'show_zero_stock_pos') as has_zero_stock,
    COUNT(*) FILTER (WHERE column_name = 'show_whatsapp_commerce') as has_whatsapp
FROM information_schema.columns
WHERE table_name = 'users_userprofile';

-- Check currency data
SELECT 
    'SSP Currency Check' as check_type,
    COUNT(*) as ssp_with_pound,
    string_agg(b.name, ', ') as businesses
FROM users_business b
WHERE b.preferred_currency_code = 'SSP' 
AND b.preferred_currency_symbol = '£';
EOF

echo ""
echo "Run this SQL in both staging and production to compare:"
echo ""
echo "1. In STAGING:"
echo "   python manage.py dbshell < /tmp/compare_db_schema.sql > /tmp/staging_schema.txt"
echo ""
echo "2. In PRODUCTION:"
echo "   python manage.py dbshell < /tmp/compare_db_schema.sql > /tmp/production_schema.txt"
echo ""
echo "3. Then compare the outputs to find differences"
echo ""
echo "========================================"
echo "Common Issues to Check:"
echo "========================================"
echo ""
echo "1. Tax Cache Fields (added recently):"
echo "   - cached_tax_rate"
echo "   - cached_tax_rate_percentage"
echo "   - cached_tax_jurisdiction"
echo "   - cached_tax_updated_at"
echo "   - cached_tax_source"
echo ""
echo "2. Currency Fields:"
echo "   - preferred_currency_symbol in users_business"
echo "   - preferred_currency_symbol in users_business_details"
echo ""
echo "3. Recent Migrations:"
echo "   - 0121_add_missing_currency_fields"
echo "   - 0122_merge_20250818_0358"
echo "   - 0123_add_cached_tax_rate_fields"
echo ""
echo "4. New Tables:"
echo "   - Check for any tax-related tables"
echo "   - Check for CRM tables (customers)"
echo ""
echo "========================================"
-- Script to extract DDL for all missing tables from production
-- Run this in PRODUCTION database to get the CREATE TABLE statements

-- Use pg_dump to get the structure of specific tables
-- This generates the SQL needed to recreate all missing tables

\echo 'Extracting DDL for all missing tables...'

-- Get CREATE TABLE statements for each missing table
SELECT 
    'CREATE TABLE ' || table_name || ' (' || chr(10) ||
    string_agg(
        '    ' || column_name || ' ' || 
        data_type || 
        CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')'
            WHEN numeric_precision IS NOT NULL 
            THEN '(' || numeric_precision || ',' || COALESCE(numeric_scale, 0) || ')'
            ELSE ''
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ',' || chr(10)
        ORDER BY ordinal_position
    ) || chr(10) || ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'custom_auth_account_deletion_log',
    'custom_auth_accountdeletionlog',
    'custom_auth_passwordresettoken',
    'developing_countries',
    'device_fingerprints',
    'device_trust',
    'discount_verifications',
    'lead_activities',
    'leads',
    'migration_log',
    'mobile_money_countries',
    'mobile_money_providers',
    'mobile_money_providers_countries',
    'page_permissions',
    'payments_invoice_payment',
    'payments_platform_fee_collection',
    'payments_vendor_payment',
    'role_template_pages',
    'role_templates',
    'session_events',
    'session_security',
    'smart_insights_creditpackage',
    'smart_insights_monthlyusage',
    'smart_insights_querylog',
    'tax_api_usage',
    'taxes_taxdataabusereport',
    'taxes_taxdatablacklist',
    'taxes_taxdataentrycontrol',
    'taxes_taxdataentrylog',
    'taxes_taxsuggestionfeedback',
    'tax_filing_locations',
    'tax_rate_cache',
    'tax_reminders',
    'tax_settings',
    'timesheets_clock_entry',
    'timesheets_geofence_zone',
    'timesheets_time_entry',
    'timesheets_time_off_request',
    'timesheets_timesheet',
    'user_deletion_tracking',
    'user_invitations',
    'user_notification_settings',
    'user_page_access',
    'users_business_details',
    'users_businessmember',
    'user_sessions',
    'users_menu_privilege',
    'users_subscription',
    'users_usermenuprivilege',
    'whatsapp_analytics',
    'whatsapp_business_settings',
    'whatsapp_catalogs',
    'whatsapp_messages',
    'whatsapp_order_items',
    'whatsapp_orders',
    'whatsapp_products'
)
GROUP BY table_name
ORDER BY table_name;
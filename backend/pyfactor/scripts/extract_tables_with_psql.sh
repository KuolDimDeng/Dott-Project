#!/bin/bash
# Alternative script using psql to extract table structures
# This avoids pg_dump version issues

echo "Extracting table structures using psql..."

# Create output file
OUTPUT_FILE="/app/scripts/create_missing_tables_staging.sql"
> $OUTPUT_FILE

# List of missing tables
MISSING_TABLES=(
    "user_sessions"
    "custom_auth_account_deletion_log"
    "custom_auth_accountdeletionlog"
    "custom_auth_passwordresettoken"
    "developing_countries"
    "device_fingerprints"
    "device_trust"
    "discount_verifications"
    "lead_activities"
    "leads"
    "migration_log"
    "mobile_money_countries"
    "mobile_money_providers"
    "mobile_money_providers_countries"
    "page_permissions"
    "payments_invoice_payment"
    "payments_platform_fee_collection"
    "payments_vendor_payment"
    "role_template_pages"
    "role_templates"
    "session_events"
    "session_security"
    "smart_insights_creditpackage"
    "smart_insights_monthlyusage"
    "smart_insights_querylog"
    "tax_api_usage"
    "taxes_taxdataabusereport"
    "taxes_taxdatablacklist"
    "taxes_taxdataentrycontrol"
    "taxes_taxdataentrylog"
    "taxes_taxsuggestionfeedback"
    "tax_filing_locations"
    "tax_rate_cache"
    "tax_reminders"
    "tax_settings"
    "timesheets_clock_entry"
    "timesheets_geofence_zone"
    "timesheets_time_entry"
    "timesheets_time_off_request"
    "timesheets_timesheet"
    "user_deletion_tracking"
    "user_invitations"
    "user_notification_settings"
    "user_page_access"
    "users_business_details"
    "users_businessmember"
    "users_menu_privilege"
    "users_subscription"
    "users_usermenuprivilege"
    "whatsapp_analytics"
    "whatsapp_business_settings"
    "whatsapp_catalogs"
    "whatsapp_messages"
    "whatsapp_order_items"
    "whatsapp_orders"
    "whatsapp_products"
)

# Extract each table structure
for table in "${MISSING_TABLES[@]}"; do
    echo "-- Table: $table" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
    
    # Get table structure using psql
    psql $DATABASE_URL -t -c "
    SELECT 
        'CREATE TABLE IF NOT EXISTS $table (' || E'\n' ||
        string_agg(
            '    ' || column_name || ' ' || 
            CASE 
                WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
                WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
                WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
                WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMP WITH TIME ZONE'
                WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
                ELSE UPPER(data_type)
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
            E',\n'
            ORDER BY ordinal_position
        ) || E'\n);'
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '$table'
    GROUP BY table_name;" >> $OUTPUT_FILE
    
    echo "" >> $OUTPUT_FILE
    
    # Get primary key
    psql $DATABASE_URL -t -c "
    SELECT 'ALTER TABLE $table ADD CONSTRAINT ' || tc.constraint_name || ' PRIMARY KEY (' || 
           string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');'
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = '$table' 
    AND tc.constraint_type = 'PRIMARY KEY'
    GROUP BY tc.constraint_name;" >> $OUTPUT_FILE
    
    echo "" >> $OUTPUT_FILE
    
    # Get indexes
    psql $DATABASE_URL -t -c "
    SELECT indexdef || ';'
    FROM pg_indexes
    WHERE tablename = '$table'
    AND indexname NOT IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = '$table'
    );" >> $OUTPUT_FILE
    
    echo "" >> $OUTPUT_FILE
    echo "-- End of $table" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
done

echo "Extraction complete! File saved to $OUTPUT_FILE"
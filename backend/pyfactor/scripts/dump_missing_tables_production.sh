#!/bin/bash
# Script to dump all missing tables from production
# Run this on PRODUCTION server

echo "Dumping missing tables from production database..."

# List of missing tables
MISSING_TABLES=(
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
    "user_sessions"
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

# Build the table arguments for pg_dump
TABLE_ARGS=""
for table in "${MISSING_TABLES[@]}"; do
    TABLE_ARGS="$TABLE_ARGS -t public.$table"
done

# Dump schema only (no data) for all missing tables
pg_dump $DATABASE_URL \
    --schema-only \
    --no-owner \
    --no-privileges \
    $TABLE_ARGS \
    > /app/scripts/create_missing_tables_staging.sql

echo "Dump complete! File saved to /app/scripts/create_missing_tables_staging.sql"
echo "Copy this file to staging and run it to create all missing tables."
-- Fix missing sequences for tables that need auto-incrementing IDs

-- Create sequences for all BIGINT ID columns that need them
CREATE SEQUENCE IF NOT EXISTS session_events_id_seq;
CREATE SEQUENCE IF NOT EXISTS session_security_id_seq;
CREATE SEQUENCE IF NOT EXISTS device_trust_id_seq;
CREATE SEQUENCE IF NOT EXISTS role_template_pages_id_seq;
CREATE SEQUENCE IF NOT EXISTS mobile_money_providers_countries_id_seq;
CREATE SEQUENCE IF NOT EXISTS smart_insights_creditpackage_id_seq;
CREATE SEQUENCE IF NOT EXISTS smart_insights_monthlyusage_id_seq;
CREATE SEQUENCE IF NOT EXISTS tax_api_usage_id_seq;
CREATE SEQUENCE IF NOT EXISTS taxes_taxdataabusereport_id_seq;
CREATE SEQUENCE IF NOT EXISTS taxes_taxdatablacklist_id_seq;
CREATE SEQUENCE IF NOT EXISTS taxes_taxdataentrycontrol_id_seq;
CREATE SEQUENCE IF NOT EXISTS taxes_taxdataentrylog_id_seq;
CREATE SEQUENCE IF NOT EXISTS tax_filing_locations_id_seq;
CREATE SEQUENCE IF NOT EXISTS tax_rate_cache_id_seq;
CREATE SEQUENCE IF NOT EXISTS tax_reminders_id_seq;
CREATE SEQUENCE IF NOT EXISTS tax_settings_id_seq;
CREATE SEQUENCE IF NOT EXISTS user_notification_settings_id_seq;

-- Set the default values for the ID columns to use the sequences
ALTER TABLE session_events ALTER COLUMN id SET DEFAULT nextval('session_events_id_seq');
ALTER TABLE session_security ALTER COLUMN id SET DEFAULT nextval('session_security_id_seq');
ALTER TABLE device_trust ALTER COLUMN id SET DEFAULT nextval('device_trust_id_seq');
ALTER TABLE role_template_pages ALTER COLUMN id SET DEFAULT nextval('role_template_pages_id_seq');
ALTER TABLE mobile_money_providers_countries ALTER COLUMN id SET DEFAULT nextval('mobile_money_providers_countries_id_seq');
ALTER TABLE smart_insights_creditpackage ALTER COLUMN id SET DEFAULT nextval('smart_insights_creditpackage_id_seq');
ALTER TABLE smart_insights_monthlyusage ALTER COLUMN id SET DEFAULT nextval('smart_insights_monthlyusage_id_seq');
ALTER TABLE tax_api_usage ALTER COLUMN id SET DEFAULT nextval('tax_api_usage_id_seq');
ALTER TABLE taxes_taxdataabusereport ALTER COLUMN id SET DEFAULT nextval('taxes_taxdataabusereport_id_seq');
ALTER TABLE taxes_taxdatablacklist ALTER COLUMN id SET DEFAULT nextval('taxes_taxdatablacklist_id_seq');
ALTER TABLE taxes_taxdataentrycontrol ALTER COLUMN id SET DEFAULT nextval('taxes_taxdataentrycontrol_id_seq');
ALTER TABLE taxes_taxdataentrylog ALTER COLUMN id SET DEFAULT nextval('taxes_taxdataentrylog_id_seq');
ALTER TABLE tax_filing_locations ALTER COLUMN id SET DEFAULT nextval('tax_filing_locations_id_seq');
ALTER TABLE tax_rate_cache ALTER COLUMN id SET DEFAULT nextval('tax_rate_cache_id_seq');
ALTER TABLE tax_reminders ALTER COLUMN id SET DEFAULT nextval('tax_reminders_id_seq');
ALTER TABLE tax_settings ALTER COLUMN id SET DEFAULT nextval('tax_settings_id_seq');
ALTER TABLE user_notification_settings ALTER COLUMN id SET DEFAULT nextval('user_notification_settings_id_seq');

-- Set the sequences to start at 1
SELECT setval('session_events_id_seq', 1, false);
SELECT setval('session_security_id_seq', 1, false);
SELECT setval('device_trust_id_seq', 1, false);
SELECT setval('role_template_pages_id_seq', 1, false);
SELECT setval('mobile_money_providers_countries_id_seq', 1, false);
SELECT setval('smart_insights_creditpackage_id_seq', 1, false);
SELECT setval('smart_insights_monthlyusage_id_seq', 1, false);
SELECT setval('tax_api_usage_id_seq', 1, false);
SELECT setval('taxes_taxdataabusereport_id_seq', 1, false);
SELECT setval('taxes_taxdatablacklist_id_seq', 1, false);
SELECT setval('taxes_taxdataentrycontrol_id_seq', 1, false);
SELECT setval('taxes_taxdataentrylog_id_seq', 1, false);
SELECT setval('tax_filing_locations_id_seq', 1, false);
SELECT setval('tax_rate_cache_id_seq', 1, false);
SELECT setval('tax_reminders_id_seq', 1, false);
SELECT setval('tax_settings_id_seq', 1, false);
SELECT setval('user_notification_settings_id_seq', 1, false);
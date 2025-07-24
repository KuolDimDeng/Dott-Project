-- Create all missing tables in staging database
-- This script contains clean SQL without the + continuation characters

-- Table: user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID NOT NULL,
    access_token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    is_active BOOLEAN NOT NULL,
    needs_onboarding BOOLEAN NOT NULL,
    onboarding_completed BOOLEAN NOT NULL,
    onboarding_step VARCHAR(50) NOT NULL,
    subscription_plan VARCHAR(50) NOT NULL,
    subscription_status VARCHAR(50) NOT NULL,
    session_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    session_type VARCHAR(20) NOT NULL,
    tenant_id UUID,
    user_id BIGINT NOT NULL
);

ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (session_id);

CREATE INDEX user_sessio_user_id_bb1b83_idx ON public.user_sessions USING btree (user_id, is_active);
CREATE INDEX user_sessio_session_10db89_idx ON public.user_sessions USING btree (session_id, expires_at);
CREATE INDEX user_sessio_tenant__6e136b_idx ON public.user_sessions USING btree (tenant_id, is_active);
CREATE INDEX user_sessio_last_ac_7cb421_idx ON public.user_sessions USING btree (last_activity);
CREATE INDEX user_sessions_tenant_id_51747a00 ON public.user_sessions USING btree (tenant_id);
CREATE INDEX user_sessions_user_id_43ce9642 ON public.user_sessions USING btree (user_id);

-- Table: custom_auth_account_deletion_log
CREATE TABLE IF NOT EXISTS custom_auth_account_deletion_log (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_email VARCHAR(254) NOT NULL,
    user_id INTEGER NOT NULL,
    tenant_id UUID,
    auth0_sub VARCHAR(255),
    deletion_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletion_reason VARCHAR(255),
    deletion_feedback TEXT,
    deletion_initiated_by VARCHAR(255) NOT NULL DEFAULT 'user'::character varying,
    auth0_deleted BOOLEAN DEFAULT false,
    database_deleted BOOLEAN DEFAULT false,
    tenant_deleted BOOLEAN DEFAULT false,
    deletion_errors JSONB,
    ip_address INET,
    user_agent TEXT
);

ALTER TABLE custom_auth_account_deletion_log ADD CONSTRAINT custom_auth_account_deletion_log_pkey PRIMARY KEY (id);

CREATE INDEX account_deletion_log_user_email_idx ON public.custom_auth_account_deletion_log USING btree (user_email);
CREATE INDEX account_deletion_log_deletion_date_idx ON public.custom_auth_account_deletion_log USING btree (deletion_date);

-- Table: custom_auth_accountdeletionlog
CREATE TABLE IF NOT EXISTS custom_auth_accountdeletionlog (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_email VARCHAR(254) NOT NULL,
    user_id INTEGER NOT NULL,
    tenant_id UUID,
    auth0_sub VARCHAR(255),
    deletion_reason TEXT,
    deletion_feedback TEXT,
    deletion_initiated_by VARCHAR(50),
    tenant_deleted BOOLEAN DEFAULT false,
    ip_address VARCHAR(45),
    user_agent TEXT,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE custom_auth_accountdeletionlog ADD CONSTRAINT custom_auth_accountdeletionlog_pkey PRIMARY KEY (id);

CREATE INDEX idx_deletion_log_email ON public.custom_auth_accountdeletionlog USING btree (user_email);
CREATE INDEX idx_deletion_log_date ON public.custom_auth_accountdeletionlog USING btree (deleted_at);

-- Table: custom_auth_passwordresettoken
CREATE SEQUENCE IF NOT EXISTS custom_auth_passwordresettoken_id_seq;
CREATE TABLE IF NOT EXISTS custom_auth_passwordresettoken (
    id INTEGER NOT NULL DEFAULT nextval('custom_auth_passwordresettoken_id_seq'::regclass),
    user_id INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    used BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE custom_auth_passwordresettoken ADD CONSTRAINT custom_auth_passwordresettoken_pkey PRIMARY KEY (id);

-- Table: developing_countries
CREATE TABLE IF NOT EXISTS developing_countries (
    id UUID NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    income_level VARCHAR(50) NOT NULL,
    discount_percentage INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE developing_countries ADD CONSTRAINT developing_countries_pkey PRIMARY KEY (id);

CREATE INDEX developing_countries_country_code_317eef84_like ON public.developing_countries USING btree (country_code varchar_pattern_ops);

-- Table: device_fingerprints
CREATE TABLE IF NOT EXISTS device_fingerprints (
    fingerprint_id UUID NOT NULL,
    fingerprint_hash VARCHAR(64) NOT NULL,
    user_agent TEXT NOT NULL,
    screen_resolution VARCHAR(20),
    timezone VARCHAR(50),
    language VARCHAR(10),
    platform VARCHAR(50),
    webgl_vendor VARCHAR(100),
    webgl_renderer VARCHAR(100),
    canvas_fingerprint VARCHAR(64),
    ip_address INET NOT NULL,
    ip_country VARCHAR(2),
    ip_region VARCHAR(100),
    is_trusted BOOLEAN NOT NULL,
    trust_score INTEGER NOT NULL,
    risk_score INTEGER NOT NULL,
    risk_factors JSONB NOT NULL,
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL,
    login_count INTEGER NOT NULL,
    failed_login_count INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_blocked BOOLEAN NOT NULL,
    blocked_reason TEXT,
    blocked_at TIMESTAMP WITH TIME ZONE,
    user_id BIGINT NOT NULL
);

ALTER TABLE device_fingerprints ADD CONSTRAINT device_fingerprints_pkey PRIMARY KEY (fingerprint_id);

CREATE INDEX device_fing_user_id_438bf4_idx ON public.device_fingerprints USING btree (user_id, is_active);
CREATE INDEX device_fing_fingerp_25f02a_idx ON public.device_fingerprints USING btree (fingerprint_hash);
CREATE INDEX device_fing_risk_sc_fa51cb_idx ON public.device_fingerprints USING btree (risk_score, is_active);
CREATE INDEX device_fingerprints_fingerprint_hash_bc323f32_like ON public.device_fingerprints USING btree (fingerprint_hash varchar_pattern_ops);
CREATE INDEX device_fingerprints_user_id_2d922ec4 ON public.device_fingerprints USING btree (user_id);

-- Table: device_trust
CREATE TABLE IF NOT EXISTS device_trust (
    id BIGINT NOT NULL,
    trust_name VARCHAR(100) NOT NULL,
    trusted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    trusted_until TIMESTAMP WITH TIME ZONE,
    verification_code VARCHAR(6),
    verified BOOLEAN NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    last_used TIMESTAMP WITH TIME ZONE NOT NULL,
    use_count INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason TEXT,
    device_fingerprint_id UUID NOT NULL,
    user_id BIGINT NOT NULL
);

ALTER TABLE device_trust ADD CONSTRAINT device_trust_pkey PRIMARY KEY (id);

CREATE INDEX device_trus_user_id_051562_idx ON public.device_trust USING btree (user_id, is_active);
CREATE INDEX device_trust_device_fingerprint_id_9032a3c4 ON public.device_trust USING btree (device_fingerprint_id);
CREATE INDEX device_trust_user_id_ec2e97fb ON public.device_trust USING btree (user_id);

-- Table: discount_verifications
CREATE TABLE IF NOT EXISTS discount_verifications (
    id UUID NOT NULL,
    claimed_country VARCHAR(2) NOT NULL,
    detected_country VARCHAR(2) NOT NULL,
    ip_address INET NOT NULL,
    verification_status VARCHAR(20) NOT NULL,
    ip_country_match BOOLEAN NOT NULL,
    payment_country_match BOOLEAN NOT NULL,
    employee_location_match BOOLEAN NOT NULL,
    risk_score INTEGER NOT NULL,
    grace_period_ends TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT NOT NULL,
    login_countries JSONB NOT NULL,
    payment_methods JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    business_id UUID NOT NULL,
    reviewed_by_id BIGINT
);

ALTER TABLE discount_verifications ADD CONSTRAINT discount_verifications_pkey PRIMARY KEY (id);

CREATE INDEX discount_verifications_reviewed_by_id_7c3a205a ON public.discount_verifications USING btree (reviewed_by_id);

-- Table: lead_activities
CREATE SEQUENCE IF NOT EXISTS lead_activities_id_seq;
CREATE TABLE IF NOT EXISTS lead_activities (
    id BIGINT NOT NULL DEFAULT nextval('lead_activities_id_seq'::regclass),
    activity_type VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by_id BIGINT,
    lead_id BIGINT NOT NULL
);

ALTER TABLE lead_activities ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);

CREATE INDEX lead_activities_lead_idx ON public.lead_activities USING btree (lead_id);
CREATE INDEX lead_activities_type_idx ON public.lead_activities USING btree (activity_type);
CREATE INDEX lead_activities_created_idx ON public.lead_activities USING btree (created_at);

-- Table: leads
CREATE SEQUENCE IF NOT EXISTS leads_id_seq;
CREATE TABLE IF NOT EXISTS leads (
    id BIGINT NOT NULL DEFAULT nextval('leads_id_seq'::regclass),
    email VARCHAR(254) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(200),
    phone_number VARCHAR(20),
    source VARCHAR(25) NOT NULL,
    message TEXT,
    status VARCHAR(15) NOT NULL DEFAULT 'new'::character varying,
    country VARCHAR(100),
    ip_address INET,
    additional_data JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    contacted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_to_id BIGINT
);

ALTER TABLE leads ADD CONSTRAINT leads_pkey PRIMARY KEY (id);

CREATE INDEX leads_email_idx ON public.leads USING btree (email);
CREATE INDEX leads_source_idx ON public.leads USING btree (source);
CREATE INDEX leads_status_idx ON public.leads USING btree (status);
CREATE INDEX leads_created_idx ON public.leads USING btree (created_at);
CREATE INDEX leads_assigned_idx ON public.leads USING btree (assigned_to_id);

-- Table: migration_log
CREATE SEQUENCE IF NOT EXISTS migration_log_id_seq;
CREATE TABLE IF NOT EXISTS migration_log (
    id INTEGER NOT NULL DEFAULT nextval('migration_log_id_seq'::regclass),
    migration_name VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'started'::character varying,
    details TEXT
);

ALTER TABLE migration_log ADD CONSTRAINT migration_log_pkey PRIMARY KEY (id);

-- Table: mobile_money_countries
CREATE TABLE IF NOT EXISTS mobile_money_countries (
    id UUID NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    paystack_enabled BOOLEAN NOT NULL,
    paystack_country_code VARCHAR(10) NOT NULL,
    providers JSONB NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_beta BOOLEAN NOT NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE mobile_money_countries ADD CONSTRAINT mobile_money_countries_pkey PRIMARY KEY (id);

CREATE INDEX mobile_money_countries_country_code_f7f87992_like ON public.mobile_money_countries USING btree (country_code varchar_pattern_ops);

-- Table: mobile_money_providers
CREATE TABLE IF NOT EXISTS mobile_money_providers (
    id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    requires_phone_number BOOLEAN NOT NULL,
    phone_number_regex VARCHAR(200) NOT NULL,
    phone_number_example VARCHAR(50) NOT NULL,
    api_identifier VARCHAR(50) NOT NULL,
    icon_url VARCHAR(200) NOT NULL,
    color_hex VARCHAR(7) NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE mobile_money_providers ADD CONSTRAINT mobile_money_providers_pkey PRIMARY KEY (id);

CREATE INDEX mobile_money_providers_code_86855bc2_like ON public.mobile_money_providers USING btree (code varchar_pattern_ops);

-- Table: mobile_money_providers_countries
CREATE TABLE IF NOT EXISTS mobile_money_providers_countries (
    id BIGINT NOT NULL,
    mobilemoneyprovider_id UUID NOT NULL,
    mobilemoneycountry_id UUID NOT NULL
);

ALTER TABLE mobile_money_providers_countries ADD CONSTRAINT mobile_money_providers_countries_pkey PRIMARY KEY (id);

CREATE INDEX mobile_money_providers_cou_mobilemoneyprovider_id_4a6297bc ON public.mobile_money_providers_countries USING btree (mobilemoneyprovider_id);
CREATE INDEX mobile_money_providers_countries_mobilemoneycountry_id_fb770294 ON public.mobile_money_providers_countries USING btree (mobilemoneycountry_id);

-- Table: page_permissions
CREATE TABLE IF NOT EXISTS page_permissions (
    id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    path VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE page_permissions ADD CONSTRAINT page_permissions_pkey PRIMARY KEY (id);

-- Table: payments_invoice_payment
CREATE TABLE IF NOT EXISTS payments_invoice_payment (
    id UUID NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    platform_fee NUMERIC(10,2),
    stripe_fee NUMERIC(10,2),
    platform_profit NUMERIC(10,2),
    status VARCHAR(50) NOT NULL,
    metadata JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    invoice_id UUID NOT NULL
);

ALTER TABLE payments_invoice_payment ADD CONSTRAINT payments_invoice_payment_pkey PRIMARY KEY (id);

CREATE INDEX payments_invoice_payment_stripe_payment_intent_id_1169d36f_like ON public.payments_invoice_payment USING btree (stripe_payment_intent_id varchar_pattern_ops);
CREATE INDEX payments_invoice_payment_invoice_id_9dcb7891 ON public.payments_invoice_payment USING btree (invoice_id);

-- Table: payments_platform_fee_collection
CREATE TABLE IF NOT EXISTS payments_platform_fee_collection (
    id UUID NOT NULL,
    business_id UUID NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    platform_fee NUMERIC(10,2) NOT NULL,
    stripe_fee NUMERIC(10,2) NOT NULL,
    platform_profit NUMERIC(10,2) NOT NULL,
    fee_percentage NUMERIC(5,4) NOT NULL,
    fixed_fee NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL,
    stripe_account_id VARCHAR(255),
    metadata JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE payments_platform_fee_collection ADD CONSTRAINT payments_platform_fee_collection_pkey PRIMARY KEY (id);

CREATE INDEX payments_platform_fee_collection_business_id_0c7d1e5f ON public.payments_platform_fee_collection USING btree (business_id);
CREATE INDEX payments_pl_busines_d56ac6_idx ON public.payments_platform_fee_collection USING btree (business_id, created_at);
CREATE INDEX payments_pl_transac_d7b969_idx ON public.payments_platform_fee_collection USING btree (transaction_type, created_at);

-- Table: payments_vendor_payment
CREATE TABLE IF NOT EXISTS payments_vendor_payment (
    id UUID NOT NULL,
    business_id UUID NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    stripe_charge_id VARCHAR(255),
    stripe_transfer_id VARCHAR(255),
    platform_fee NUMERIC(10,2),
    total_charged NUMERIC(10,2),
    status VARCHAR(50) NOT NULL,
    metadata JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    vendor_id UUID NOT NULL
);

ALTER TABLE payments_vendor_payment ADD CONSTRAINT payments_vendor_payment_pkey PRIMARY KEY (id);

CREATE INDEX payments_vendor_payment_business_id_24f0b490 ON public.payments_vendor_payment USING btree (business_id);
CREATE INDEX payments_vendor_payment_stripe_charge_id_1930d1d3_like ON public.payments_vendor_payment USING btree (stripe_charge_id varchar_pattern_ops);
CREATE INDEX payments_vendor_payment_stripe_transfer_id_45281b2a_like ON public.payments_vendor_payment USING btree (stripe_transfer_id varchar_pattern_ops);
CREATE INDEX payments_vendor_payment_vendor_id_231b0338 ON public.payments_vendor_payment USING btree (vendor_id);

-- Table: role_template_pages
CREATE TABLE IF NOT EXISTS role_template_pages (
    id BIGINT NOT NULL,
    can_read BOOLEAN NOT NULL,
    can_write BOOLEAN NOT NULL,
    can_edit BOOLEAN NOT NULL,
    can_delete BOOLEAN NOT NULL,
    page_id UUID NOT NULL,
    template_id UUID NOT NULL
);

ALTER TABLE role_template_pages ADD CONSTRAINT role_template_pages_pkey PRIMARY KEY (id);

CREATE INDEX role_template_pages_page_id_dd3e8e6a ON public.role_template_pages USING btree (page_id);
CREATE INDEX role_template_pages_template_id_3705b360 ON public.role_template_pages USING btree (template_id);

-- Table: role_templates
CREATE TABLE IF NOT EXISTS role_templates (
    id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE role_templates ADD CONSTRAINT role_templates_pkey PRIMARY KEY (id);

-- Table: session_events
CREATE TABLE IF NOT EXISTS session_events (
    id BIGINT NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    event_data JSONB NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    session_id UUID NOT NULL
);

ALTER TABLE session_events ADD CONSTRAINT session_events_pkey PRIMARY KEY (id);

CREATE INDEX session_eve_session_445439_idx ON public.session_events USING btree (session_id, created_at);
CREATE INDEX session_eve_event_t_6bc1c5_idx ON public.session_events USING btree (event_type, created_at);
CREATE INDEX session_events_session_id_16b69ca5 ON public.session_events USING btree (session_id);

-- Table: session_security
CREATE TABLE IF NOT EXISTS session_security (
    id BIGINT NOT NULL,
    initial_risk_score INTEGER NOT NULL,
    current_risk_score INTEGER NOT NULL,
    risk_factors JSONB NOT NULL,
    is_verified BOOLEAN NOT NULL,
    verification_method VARCHAR(50),
    verified_at TIMESTAMP WITH TIME ZONE,
    anomaly_score INTEGER NOT NULL,
    anomalies_detected JSONB NOT NULL,
    last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL,
    heartbeat_interval INTEGER NOT NULL,
    missed_heartbeats INTEGER NOT NULL,
    security_events JSONB NOT NULL,
    device_fingerprint_id UUID,
    session_id UUID NOT NULL
);

ALTER TABLE session_security ADD CONSTRAINT session_security_pkey PRIMARY KEY (id);

CREATE INDEX session_sec_current_e1668b_idx ON public.session_security USING btree (current_risk_score);
CREATE INDEX session_sec_last_he_00323f_idx ON public.session_security USING btree (last_heartbeat);
CREATE INDEX session_security_device_fingerprint_id_7d5908a4 ON public.session_security USING btree (device_fingerprint_id);

-- Table: smart_insights_creditpackage
CREATE TABLE IF NOT EXISTS smart_insights_creditpackage (
    id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    credits INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    stripe_price_id VARCHAR(255),
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE smart_insights_creditpackage ADD CONSTRAINT smart_insights_creditpackage_pkey PRIMARY KEY (id);

-- Table: smart_insights_monthlyusage
CREATE TABLE IF NOT EXISTS smart_insights_monthlyusage (
    id BIGINT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_credits_used INTEGER NOT NULL,
    total_cost NUMERIC(10,2) NOT NULL,
    query_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id BIGINT NOT NULL
);

ALTER TABLE smart_insights_monthlyusage ADD CONSTRAINT smart_insights_monthlyusage_pkey PRIMARY KEY (id);

CREATE INDEX smart_insights_monthlyusage_user_id_5b29a6f7 ON public.smart_insights_monthlyusage USING btree (user_id);
CREATE INDEX smart_insig_user_id_4e5678_idx ON public.smart_insights_monthlyusage USING btree (user_id, year, month);

-- Table: smart_insights_querylog
CREATE TABLE IF NOT EXISTS smart_insights_querylog (
    id UUID NOT NULL,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    credits_used INTEGER NOT NULL,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id BIGINT NOT NULL
);

ALTER TABLE smart_insights_querylog ADD CONSTRAINT smart_insights_querylog_pkey PRIMARY KEY (id);

CREATE INDEX smart_insights_querylog_user_id_f304aec3 ON public.smart_insights_querylog USING btree (user_id);
CREATE INDEX smart_insig_user_id_3e1234_idx ON public.smart_insights_querylog USING btree (user_id, created_at DESC);

-- Continue with remaining tables...
-- (File truncated for length - would continue with all remaining tables)-- Part 2: Continue creating missing tables

-- Table: tax_api_usage
CREATE TABLE IF NOT EXISTS tax_api_usage (
    id BIGINT NOT NULL,
    tenant_id UUID,
    month_year VARCHAR(7) NOT NULL,
    api_calls_count INTEGER NOT NULL,
    cache_hits_count INTEGER NOT NULL,
    monthly_limit INTEGER NOT NULL,
    plan_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE tax_api_usage ADD CONSTRAINT tax_api_usage_pkey PRIMARY KEY (id);

CREATE INDEX tax_api_usage_tenant_id_7166c998 ON public.tax_api_usage USING btree (tenant_id);
CREATE INDEX tax_api_usage_month_year_c7339bb1 ON public.tax_api_usage USING btree (month_year);
CREATE INDEX tax_api_usage_month_year_c7339bb1_like ON public.tax_api_usage USING btree (month_year varchar_pattern_ops);

-- Table: taxes_taxdataabusereport
CREATE TABLE IF NOT EXISTS taxes_taxdataabusereport (
    id BIGINT NOT NULL,
    tenant_id UUID,
    report_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    evidence JSONB,
    action_taken TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by_id BIGINT,
    user_id BIGINT
);

ALTER TABLE taxes_taxdataabusereport ADD CONSTRAINT taxes_taxdataabusereport_pkey PRIMARY KEY (id);

CREATE INDEX taxes_taxdataabusereport_tenant_id_8552832f ON public.taxes_taxdataabusereport USING btree (tenant_id);
CREATE INDEX taxes_taxdataabusereport_resolved_by_id_d8b06d14 ON public.taxes_taxdataabusereport USING btree (resolved_by_id);
CREATE INDEX taxes_taxdataabusereport_user_id_4fe76ec9 ON public.taxes_taxdataabusereport USING btree (user_id);

-- Table: taxes_taxdatablacklist
CREATE TABLE IF NOT EXISTS taxes_taxdatablacklist (
    id BIGINT NOT NULL,
    tenant_id UUID,
    blacklist_type VARCHAR(20) NOT NULL,
    identifier VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by_id BIGINT
);

ALTER TABLE taxes_taxdatablacklist ADD CONSTRAINT taxes_taxdatablacklist_pkey PRIMARY KEY (id);

CREATE INDEX taxes_taxdatablacklist_tenant_id_5644218c ON public.taxes_taxdatablacklist USING btree (tenant_id);
CREATE INDEX taxes_taxdatablacklist_identifier_070fd773 ON public.taxes_taxdatablacklist USING btree (identifier);
CREATE INDEX taxes_taxdatablacklist_identifier_070fd773_like ON public.taxes_taxdatablacklist USING btree (identifier varchar_pattern_ops);
CREATE INDEX taxes_taxdatablacklist_created_by_id_5891519c ON public.taxes_taxdatablacklist USING btree (created_by_id);

-- Table: taxes_taxdataentrycontrol
CREATE TABLE IF NOT EXISTS taxes_taxdataentrycontrol (
    id BIGINT NOT NULL,
    tenant_id UUID,
    control_type VARCHAR(50) NOT NULL,
    max_entries_per_hour INTEGER NOT NULL,
    max_entries_per_day INTEGER NOT NULL,
    max_entries_per_month INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE taxes_taxdataentrycontrol ADD CONSTRAINT taxes_taxdataentrycontrol_pkey PRIMARY KEY (id);

CREATE INDEX taxes_taxdataentrycontrol_tenant_id_948d3c65 ON public.taxes_taxdataentrycontrol USING btree (tenant_id);

-- Table: taxes_taxdataentrylog
CREATE TABLE IF NOT EXISTS taxes_taxdataentrylog (
    id BIGINT NOT NULL,
    tenant_id UUID,
    control_type VARCHAR(50) NOT NULL,
    entry_type VARCHAR(20) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    entry_count INTEGER NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id BIGINT
);

ALTER TABLE taxes_taxdataentrylog ADD CONSTRAINT taxes_taxdataentrylog_pkey PRIMARY KEY (id);

CREATE INDEX taxes_taxdataentrylog_tenant_id_0102132f ON public.taxes_taxdataentrylog USING btree (tenant_id);
CREATE INDEX taxes_taxdataentrylog_user_id_b092bbf1 ON public.taxes_taxdataentrylog USING btree (user_id);
CREATE INDEX taxes_taxda_tenant__d3b917_idx ON public.taxes_taxdataentrylog USING btree (tenant_id, control_type, created_at);
CREATE INDEX taxes_taxda_user_id_4cf80b_idx ON public.taxes_taxdataentrylog USING btree (user_id, created_at);
CREATE INDEX taxes_taxda_status_88ab59_idx ON public.taxes_taxdataentrylog USING btree (status, created_at);

-- Table: taxes_taxsuggestionfeedback
CREATE TABLE IF NOT EXISTS taxes_taxsuggestionfeedback (
    id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    user_email VARCHAR(254) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    tax_type VARCHAR(50) NOT NULL,
    original_suggestion TEXT NOT NULL,
    user_feedback TEXT NOT NULL,
    correct_info TEXT NOT NULL,
    confidence_score NUMERIC(3,2),
    status VARCHAR(20) NOT NULL,
    resolution_notes TEXT NOT NULL,
    reviewed_by VARCHAR(200) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE taxes_taxsuggestionfeedback ADD CONSTRAINT taxes_taxsuggestionfeedback_pkey PRIMARY KEY (id);

CREATE INDEX taxes_taxsu_status_f0d8a5_idx ON public.taxes_taxsuggestionfeedback USING btree (status, created_at);
CREATE INDEX taxes_taxsu_country_c60e8e_idx ON public.taxes_taxsuggestionfeedback USING btree (country_code, business_type);
CREATE INDEX taxes_taxsu_tax_typ_3e5c7b_idx ON public.taxes_taxsuggestionfeedback USING btree (tax_type, status);
CREATE INDEX taxes_taxsuggestionfeedback_tenant_id_077328ab ON public.taxes_taxsuggestionfeedback USING btree (tenant_id);
CREATE INDEX taxes_taxsuggestionfeedback_user_email_3d3bd1ef ON public.taxes_taxsuggestionfeedback USING btree (user_email);
CREATE INDEX taxes_taxsuggestionfeedback_user_email_3d3bd1ef_like ON public.taxes_taxsuggestionfeedback USING btree (user_email varchar_pattern_ops);
CREATE INDEX taxes_taxsuggestionfeedback_country_code_cd94eb7a ON public.taxes_taxsuggestionfeedback USING btree (country_code);
CREATE INDEX taxes_taxsuggestionfeedback_country_code_cd94eb7a_like ON public.taxes_taxsuggestionfeedback USING btree (country_code varchar_pattern_ops);
CREATE INDEX taxes_taxsuggestionfeedback_business_type_07ebe93b ON public.taxes_taxsuggestionfeedback USING btree (business_type);
CREATE INDEX taxes_taxsuggestionfeedback_business_type_07ebe93b_like ON public.taxes_taxsuggestionfeedback USING btree (business_type varchar_pattern_ops);
CREATE INDEX taxes_taxsuggestionfeedback_tax_type_7dd69e70 ON public.taxes_taxsuggestionfeedback USING btree (tax_type);
CREATE INDEX taxes_taxsuggestionfeedback_tax_type_7dd69e70_like ON public.taxes_taxsuggestionfeedback USING btree (tax_type varchar_pattern_ops);
CREATE INDEX taxes_taxsuggestionfeedback_status_a004abf6 ON public.taxes_taxsuggestionfeedback USING btree (status);
CREATE INDEX taxes_taxsuggestionfeedback_status_a004abf6_like ON public.taxes_taxsuggestionfeedback USING btree (status varchar_pattern_ops);

-- Table: tax_filing_locations
CREATE TABLE IF NOT EXISTS tax_filing_locations (
    id BIGINT NOT NULL,
    country VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    federal_website VARCHAR(500) NOT NULL,
    federal_name VARCHAR(255) NOT NULL,
    federal_address TEXT NOT NULL,
    federal_phone VARCHAR(50) NOT NULL,
    federal_email VARCHAR(254) NOT NULL,
    state_website VARCHAR(500) NOT NULL,
    state_name VARCHAR(255) NOT NULL,
    state_address TEXT NOT NULL,
    state_phone VARCHAR(50) NOT NULL,
    state_email VARCHAR(254) NOT NULL,
    local_website VARCHAR(500) NOT NULL,
    local_name VARCHAR(255) NOT NULL,
    local_address TEXT NOT NULL,
    local_phone VARCHAR(50) NOT NULL,
    local_email VARCHAR(254) NOT NULL,
    filing_deadlines JSONB NOT NULL,
    special_instructions TEXT NOT NULL,
    tax_types JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN NOT NULL,
    lookup_count INTEGER NOT NULL
);

ALTER TABLE tax_filing_locations ADD CONSTRAINT tax_filing_locations_pkey PRIMARY KEY (id);

CREATE INDEX tax_filing__country_42de96_idx ON public.tax_filing_locations USING btree (country, state_province);
CREATE INDEX tax_filing__last_up_c90f92_idx ON public.tax_filing_locations USING btree (last_updated);
CREATE INDEX tax_filing__lookup__8c0de4_idx ON public.tax_filing_locations USING btree (lookup_count);

-- Table: tax_rate_cache
CREATE TABLE IF NOT EXISTS tax_rate_cache (
    id BIGINT NOT NULL,
    country VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    business_type VARCHAR(50) NOT NULL,
    sales_tax_rate NUMERIC(5,2) NOT NULL,
    income_tax_rate NUMERIC(5,2) NOT NULL,
    payroll_tax_rate NUMERIC(5,2) NOT NULL,
    filing_website VARCHAR(500) NOT NULL,
    filing_address TEXT NOT NULL,
    filing_deadlines TEXT NOT NULL,
    confidence_score INTEGER NOT NULL,
    source VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    hit_count INTEGER NOT NULL,
    last_accessed TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE tax_rate_cache ADD CONSTRAINT tax_rate_cache_pkey PRIMARY KEY (id);

CREATE INDEX tax_rate_cache_country_543654a0 ON public.tax_rate_cache USING btree (country);
CREATE INDEX tax_rate_cache_country_543654a0_like ON public.tax_rate_cache USING btree (country varchar_pattern_ops);
CREATE INDEX tax_rate_cache_state_province_8ad0df4b ON public.tax_rate_cache USING btree (state_province);
CREATE INDEX tax_rate_cache_state_province_8ad0df4b_like ON public.tax_rate_cache USING btree (state_province varchar_pattern_ops);
CREATE INDEX tax_rate_cache_city_ec06fe1e ON public.tax_rate_cache USING btree (city);
CREATE INDEX tax_rate_cache_city_ec06fe1e_like ON public.tax_rate_cache USING btree (city varchar_pattern_ops);
CREATE INDEX tax_rate_cache_business_type_0d3b1cdb ON public.tax_rate_cache USING btree (business_type);
CREATE INDEX tax_rate_cache_business_type_0d3b1cdb_like ON public.tax_rate_cache USING btree (business_type varchar_pattern_ops);
CREATE INDEX tax_rate_cache_expires_at_55c2ea29 ON public.tax_rate_cache USING btree (expires_at);
CREATE INDEX tax_rate_ca_expires_0a7f04_idx ON public.tax_rate_cache USING btree (expires_at);
CREATE INDEX tax_rate_ca_last_ac_f413ff_idx ON public.tax_rate_cache USING btree (last_accessed);

-- Table: tax_reminders
CREATE TABLE IF NOT EXISTS tax_reminders (
    id BIGINT NOT NULL,
    tenant_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    reminder_type VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE tax_reminders ADD CONSTRAINT tax_reminders_pkey PRIMARY KEY (id);

CREATE INDEX tax_reminders_tenant_id_c72fb922 ON public.tax_reminders USING btree (tenant_id);
CREATE INDEX tax_reminde_tenant__c58185_idx ON public.tax_reminders USING btree (tenant_id, due_date);
CREATE INDEX tax_reminde_tenant__516c65_idx ON public.tax_reminders USING btree (tenant_id, status);

-- Table: tax_settings
CREATE TABLE IF NOT EXISTS tax_settings (
    id BIGINT NOT NULL,
    tenant_id UUID,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50) NOT NULL,
    country VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    sales_tax_rate NUMERIC(5,2) NOT NULL,
    income_tax_rate NUMERIC(5,2) NOT NULL,
    payroll_tax_rate NUMERIC(5,2) NOT NULL,
    filing_website VARCHAR(500) NOT NULL,
    filing_address TEXT NOT NULL,
    filing_deadlines TEXT NOT NULL,
    ai_suggested BOOLEAN NOT NULL,
    ai_confidence_score INTEGER,
    approved_by_name VARCHAR(255) NOT NULL,
    approved_by_signature VARCHAR(255) NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_ip_address INET,
    confirmation_email_sent BOOLEAN NOT NULL,
    confirmation_email_sent_at TIMESTAMP WITH TIME ZONE,
    confirmation_email_sent_to VARCHAR(254) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE tax_settings ADD CONSTRAINT tax_settings_pkey PRIMARY KEY (id);

CREATE INDEX tax_settings_tenant_id_00faa193 ON public.tax_settings USING btree (tenant_id);

-- Table: timesheets_clock_entry
CREATE TABLE IF NOT EXISTS timesheets_clock_entry (
    id UUID NOT NULL,
    business_id UUID NOT NULL,
    entry_type VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    location_enabled BOOLEAN NOT NULL,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    location_accuracy NUMERIC(10,2),
    is_within_geofence BOOLEAN,
    ip_address INET,
    user_agent TEXT NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    notes TEXT NOT NULL,
    is_manual BOOLEAN NOT NULL,
    adjustment_reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    adjusted_by_id UUID,
    employee_id UUID NOT NULL
);

ALTER TABLE timesheets_clock_entry ADD CONSTRAINT timesheets_clock_entry_pkey PRIMARY KEY (id);

CREATE INDEX timesheets__employe_203e66_idx ON public.timesheets_clock_entry USING btree (employee_id, "timestamp");
CREATE INDEX timesheets__busines_18c8c3_idx ON public.timesheets_clock_entry USING btree (business_id, "timestamp");
CREATE INDEX timesheets_clock_entry_business_id_9f1b12e8 ON public.timesheets_clock_entry USING btree (business_id);
CREATE INDEX timesheets_clock_entry_timestamp_dc2e4e0e ON public.timesheets_clock_entry USING btree ("timestamp");
CREATE INDEX timesheets_clock_entry_adjusted_by_id_772faf6c ON public.timesheets_clock_entry USING btree (adjusted_by_id);
CREATE INDEX timesheets_clock_entry_employee_id_ce9cfd87 ON public.timesheets_clock_entry USING btree (employee_id);

-- Table: timesheets_geofence_zone
CREATE TABLE IF NOT EXISTS timesheets_geofence_zone (
    id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    zone_type VARCHAR(20) NOT NULL,
    center_latitude NUMERIC(9,6),
    center_longitude NUMERIC(9,6),
    radius_meters INTEGER,
    polygon_points JSONB NOT NULL,
    is_active BOOLEAN NOT NULL,
    require_location BOOLEAN NOT NULL,
    allow_clock_outside BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    business_id UUID NOT NULL
);

ALTER TABLE timesheets_geofence_zone ADD CONSTRAINT timesheets_geofence_zone_pkey PRIMARY KEY (id);

CREATE INDEX timesheets_geofence_zone_business_id_a538406f ON public.timesheets_geofence_zone USING btree (business_id);

-- Table: timesheets_time_entry
CREATE TABLE IF NOT EXISTS timesheets_time_entry (
    id UUID NOT NULL,
    date DATE NOT NULL,
    regular_hours NUMERIC(4,2) NOT NULL,
    overtime_hours NUMERIC(4,2) NOT NULL,
    sick_hours NUMERIC(4,2) NOT NULL,
    vacation_hours NUMERIC(4,2) NOT NULL,
    holiday_hours NUMERIC(4,2) NOT NULL,
    unpaid_leave_hours NUMERIC(4,2) NOT NULL,
    other_hours NUMERIC(4,2) NOT NULL,
    other_description VARCHAR(200) NOT NULL,
    total_hours NUMERIC(4,2) NOT NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    timesheet_id UUID NOT NULL
);

ALTER TABLE timesheets_time_entry ADD CONSTRAINT timesheets_time_entry_pkey PRIMARY KEY (id);

CREATE INDEX timesheets_time_entry_timesheet_id_fc59afe1 ON public.timesheets_time_entry USING btree (timesheet_id);

-- Table: timesheets_time_off_request
CREATE TABLE IF NOT EXISTS timesheets_time_off_request (
    id UUID NOT NULL,
    business_id UUID NOT NULL,
    request_type VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_full_day BOOLEAN NOT NULL,
    start_time TIME WITHOUT TIME ZONE,
    end_time TIME WITHOUT TIME ZONE,
    total_hours NUMERIC(6,2) NOT NULL,
    total_days NUMERIC(5,1) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    employee_id UUID NOT NULL,
    reviewed_by_id UUID
);

ALTER TABLE timesheets_time_off_request ADD CONSTRAINT timesheets_time_off_request_pkey PRIMARY KEY (id);

CREATE INDEX timesheets__employe_9c479a_idx ON public.timesheets_time_off_request USING btree (employee_id, status);
CREATE INDEX timesheets__busines_064b3b_idx ON public.timesheets_time_off_request USING btree (business_id, start_date);
CREATE INDEX timesheets_time_off_request_business_id_ac74556c ON public.timesheets_time_off_request USING btree (business_id);
CREATE INDEX timesheets_time_off_request_employee_id_10a611f1 ON public.timesheets_time_off_request USING btree (employee_id);
CREATE INDEX timesheets_time_off_request_reviewed_by_id_d221a629 ON public.timesheets_time_off_request USING btree (reviewed_by_id);

-- Table: timesheets_timesheet
CREATE TABLE IF NOT EXISTS timesheets_timesheet (
    id UUID NOT NULL,
    business_id UUID NOT NULL,
    week_starting DATE NOT NULL,
    week_ending DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    total_regular_hours NUMERIC(5,2) NOT NULL,
    total_overtime_hours NUMERIC(5,2) NOT NULL,
    total_hours NUMERIC(5,2) NOT NULL,
    hourly_rate NUMERIC(10,2),
    overtime_rate NUMERIC(10,2),
    total_pay NUMERIC(10,2) NOT NULL,
    employee_notes TEXT NOT NULL,
    supervisor_notes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    approved_by_id UUID,
    employee_id UUID NOT NULL,
    supervisor_id UUID
);

ALTER TABLE timesheets_timesheet ADD CONSTRAINT timesheets_timesheet_pkey PRIMARY KEY (id);

CREATE INDEX timesheets__busines_945112_idx ON public.timesheets_timesheet USING btree (business_id, week_starting);
CREATE INDEX timesheets__employe_33a42e_idx ON public.timesheets_timesheet USING btree (employee_id, status);
CREATE INDEX timesheets_timesheet_business_id_c07fb9ba ON public.timesheets_timesheet USING btree (business_id);
CREATE INDEX timesheets_timesheet_week_starting_0f0bec13 ON public.timesheets_timesheet USING btree (week_starting);
CREATE INDEX timesheets_timesheet_approved_by_id_1f0f98b7 ON public.timesheets_timesheet USING btree (approved_by_id);
CREATE INDEX timesheets_timesheet_employee_id_491b8c4c ON public.timesheets_timesheet USING btree (employee_id);
CREATE INDEX timesheets_timesheet_supervisor_id_4454ce9b ON public.timesheets_timesheet USING btree (supervisor_id);

-- Table: user_deletion_tracking
CREATE TABLE IF NOT EXISTS user_deletion_tracking (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    email_hash VARCHAR(255) NOT NULL,
    original_user_id INTEGER NOT NULL,
    original_tenant_id UUID,
    deletion_requested_at TIMESTAMP NOT NULL,
    grace_period_ends_at TIMESTAMP NOT NULL,
    permanently_deleted_at TIMESTAMP,
    reactivated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_deletion_tracking ADD CONSTRAINT user_deletion_tracking_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX idx_deletion_tracking_email_hash ON public.user_deletion_tracking USING btree (email_hash);
CREATE INDEX idx_deletion_tracking_grace_period ON public.user_deletion_tracking USING btree (grace_period_ends_at);

-- Table: user_invitations
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID NOT NULL,
    email VARCHAR(254) NOT NULL,
    role VARCHAR(10) NOT NULL,
    invitation_token VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    page_permissions JSONB NOT NULL,
    invited_by_id BIGINT NOT NULL,
    tenant_id UUID NOT NULL
);

ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_pkey PRIMARY KEY (id);

CREATE INDEX user_invitations_invitation_token_bd2b9caa_like ON public.user_invitations USING btree (invitation_token varchar_pattern_ops);
CREATE INDEX user_invitations_invited_by_id_16015e85 ON public.user_invitations USING btree (invited_by_id);
CREATE INDEX user_invitations_tenant_id_73d4683b ON public.user_invitations USING btree (tenant_id);

-- Table: user_notification_settings
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id BIGINT NOT NULL,
    tenant_id UUID,
    user_email VARCHAR(254) NOT NULL,
    email_notifications BOOLEAN NOT NULL,
    push_notifications BOOLEAN NOT NULL,
    in_app_notifications BOOLEAN NOT NULL,
    system_notifications BOOLEAN NOT NULL,
    product_updates BOOLEAN NOT NULL,
    security_alerts BOOLEAN NOT NULL,
    maintenance_notices BOOLEAN NOT NULL,
    billing_updates BOOLEAN NOT NULL,
    tax_updates BOOLEAN NOT NULL,
    quiet_hours_start TIME WITHOUT TIME ZONE,
    quiet_hours_end TIME WITHOUT TIME ZONE,
    timezone VARCHAR(50) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE user_notification_settings ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);

CREATE INDEX user_notification_settings_tenant_id_3e666b6e ON public.user_notification_settings USING btree (tenant_id);

-- Table: user_page_access
CREATE TABLE IF NOT EXISTS user_page_access (
    id UUID NOT NULL,
    can_read BOOLEAN NOT NULL,
    can_write BOOLEAN NOT NULL,
    can_edit BOOLEAN NOT NULL,
    can_delete BOOLEAN NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    granted_by_id BIGINT,
    page_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    user_id BIGINT NOT NULL
);

ALTER TABLE user_page_access ADD CONSTRAINT user_page_access_pkey PRIMARY KEY (id);

CREATE INDEX user_page_access_granted_by_id_2fd56360 ON public.user_page_access USING btree (granted_by_id);
CREATE INDEX user_page_access_page_id_b3dc0969 ON public.user_page_access USING btree (page_id);
CREATE INDEX user_page_access_tenant_id_b07118af ON public.user_page_access USING btree (tenant_id);
CREATE INDEX user_page_access_user_id_de8121a1 ON public.user_page_access USING btree (user_id);

-- Table: users_business_details
CREATE TABLE IF NOT EXISTS users_business_details (
    business_id UUID NOT NULL,
    business_type VARCHAR(50),
    business_subtype_selections JSONB DEFAULT '{}'::jsonb,
    legal_structure VARCHAR(50) DEFAULT 'SOLE_PROPRIETORSHIP'::character varying,
    date_founded DATE,
    country VARCHAR(2) DEFAULT 'US'::character varying,
    tenant_id UUID
);

ALTER TABLE users_business_details ADD CONSTRAINT users_business_details_pkey PRIMARY KEY (business_id);

-- Table: users_businessmember
CREATE SEQUENCE IF NOT EXISTS users_businessmember_id_seq;
CREATE TABLE IF NOT EXISTS users_businessmember (
    id INTEGER NOT NULL DEFAULT nextval('users_businessmember_id_seq'::regclass),
    business_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users_businessmember ADD CONSTRAINT users_businessmember_pkey PRIMARY KEY (id);

-- Table: users_menu_privilege
CREATE TABLE IF NOT EXISTS users_menu_privilege (
    id UUID NOT NULL,
    menu_items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    business_member_id BIGINT NOT NULL,
    created_by_id BIGINT
);

ALTER TABLE users_menu_privilege ADD CONSTRAINT users_menu_privilege_pkey PRIMARY KEY (id);

CREATE INDEX users_menu_privilege_created_by_id_ed80331f ON public.users_menu_privilege USING btree (created_by_id);
CREATE INDEX users_menu__busines_f76fcb_idx ON public.users_menu_privilege USING btree (business_member_id);

-- Table: users_subscription
CREATE SEQUENCE IF NOT EXISTS users_subscription_id_seq;
CREATE TABLE IF NOT EXISTS users_subscription (
    id INTEGER NOT NULL DEFAULT nextval('users_subscription_id_seq'::regclass),
    business_id UUID NOT NULL,
    selected_plan VARCHAR(20) NOT NULL DEFAULT 'free'::character varying,
    start_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    end_date DATE,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly'::character varying,
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(20) NOT NULL,
    grace_period_ends TIMESTAMP WITH TIME ZONE,
    failed_payment_count INTEGER NOT NULL,
    last_payment_attempt TIMESTAMP WITH TIME ZONE
);

ALTER TABLE users_subscription ADD CONSTRAINT users_subscription_pkey PRIMARY KEY (id);

CREATE INDEX users_subscription_stripe_subscription_id_3718d41a_like ON public.users_subscription USING btree (stripe_subscription_id varchar_pattern_ops);

-- Table: users_usermenuprivilege
CREATE TABLE IF NOT EXISTS users_usermenuprivilege (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    business_member_id BIGINT NOT NULL,
    menu_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_id UUID
);

ALTER TABLE users_usermenuprivilege ADD CONSTRAINT users_usermenuprivilege_pkey PRIMARY KEY (id);

CREATE INDEX users_menu_privilege_business_member_idx ON public.users_usermenuprivilege USING btree (business_member_id);

-- Table: whatsapp_analytics
CREATE SEQUENCE IF NOT EXISTS whatsapp_analytics_id_seq;
CREATE TABLE IF NOT EXISTS whatsapp_analytics (
    id BIGINT NOT NULL DEFAULT nextval('whatsapp_analytics_id_seq'::regclass),
    date DATE NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_read INTEGER DEFAULT 0,
    catalog_shares INTEGER DEFAULT 0,
    catalog_views INTEGER DEFAULT 0,
    orders_initiated INTEGER DEFAULT 0,
    orders_completed INTEGER DEFAULT 0,
    orders_cancelled INTEGER DEFAULT 0,
    total_revenue NUMERIC(10,2) DEFAULT 0.00,
    dott_fees_collected NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL
);

ALTER TABLE whatsapp_analytics ADD CONSTRAINT whatsapp_analytics_pkey PRIMARY KEY (id);

-- Table: whatsapp_business_settings
CREATE SEQUENCE IF NOT EXISTS whatsapp_business_settings_id_seq;
CREATE TABLE IF NOT EXISTS whatsapp_business_settings (
    id BIGINT NOT NULL DEFAULT nextval('whatsapp_business_settings_id_seq'::regclass),
    is_enabled BOOLEAN DEFAULT true,
    business_name VARCHAR(255),
    business_description TEXT,
    whatsapp_number VARCHAR(20),
    welcome_message TEXT DEFAULT 'Welcome to our business! Browse our catalog and shop with ease.'::text,
    auto_reply_enabled BOOLEAN DEFAULT true,
    catalog_enabled BOOLEAN DEFAULT true,
    payment_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL
);

ALTER TABLE whatsapp_business_settings ADD CONSTRAINT whatsapp_business_settings_pkey PRIMARY KEY (id);

-- Table: whatsapp_catalogs
CREATE SEQUENCE IF NOT EXISTS whatsapp_catalogs_id_seq;
CREATE TABLE IF NOT EXISTS whatsapp_catalogs (
    id BIGINT NOT NULL DEFAULT nextval('whatsapp_catalogs_id_seq'::regclass),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    catalog_url VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL
);

ALTER TABLE whatsapp_catalogs ADD CONSTRAINT whatsapp_catalogs_pkey PRIMARY KEY (id);

-- Table: whatsapp_messages
CREATE SEQUENCE IF NOT EXISTS whatsapp_messages_id_seq;
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id BIGINT NOT NULL DEFAULT nextval('whatsapp_messages_id_seq'::regclass),
    recipient_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    message_content TEXT NOT NULL,
    whatsapp_message_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'sent'::character varying,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    related_order_id UUID,
    tenant_id UUID NOT NULL
);

ALTER TABLE whatsapp_messages ADD CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id);

-- Table: whatsapp_order_items
CREATE SEQUENCE IF NOT EXISTS whatsapp_order_items_id_seq;
CREATE TABLE IF NOT EXISTS whatsapp_order_items (
    id BIGINT NOT NULL DEFAULT nextval('whatsapp_order_items_id_seq'::regclass),
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    order_id UUID NOT NULL,
    product_id BIGINT NOT NULL
);

ALTER TABLE whatsapp_order_items ADD CONSTRAINT whatsapp_order_items_pkey PRIMARY KEY (id);

-- Table: whatsapp_orders
CREATE TABLE IF NOT EXISTS whatsapp_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255),
    customer_address TEXT,
    total_amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD'::character varying,
    order_status VARCHAR(20) DEFAULT 'pending'::character varying,
    payment_status VARCHAR(20) DEFAULT 'pending'::character varying,
    payment_method VARCHAR(20),
    payment_reference VARCHAR(100),
    payment_link VARCHAR(200),
    dott_fee_amount NUMERIC(10,2) DEFAULT 0.00,
    dott_fee_currency VARCHAR(3) DEFAULT 'USD'::character varying,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL
);

ALTER TABLE whatsapp_orders ADD CONSTRAINT whatsapp_orders_pkey PRIMARY KEY (id);

-- Table: whatsapp_products
CREATE SEQUENCE IF NOT EXISTS whatsapp_products_id_seq;
CREATE TABLE IF NOT EXISTS whatsapp_products (
    id BIGINT NOT NULL DEFAULT nextval('whatsapp_products_id_seq'::regclass),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    item_type VARCHAR(20) DEFAULT 'product'::character varying,
    price NUMERIC(10,2) NOT NULL,
    price_type VARCHAR(20) DEFAULT 'fixed'::character varying,
    currency VARCHAR(3) DEFAULT 'USD'::character varying,
    image_url VARCHAR(200),
    sku VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    category VARCHAR(100),
    duration_minutes INTEGER,
    service_location VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    catalog_id BIGINT NOT NULL,
    linked_product_id UUID
);

ALTER TABLE whatsapp_products ADD CONSTRAINT whatsapp_products_pkey PRIMARY KEY (id);

-- End of script
-- All 56 missing tables have been created
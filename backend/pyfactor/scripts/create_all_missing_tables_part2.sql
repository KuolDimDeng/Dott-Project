-- Part 2: Continue creating missing tables

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
#!/usr/bin/env python
import sys
import os
import argparse
from pathlib import Path

def generate_sql_for_app(app_name):
    """Generate SQL to create tables with UUIDs for the given app"""
    if app_name == 'crm':
        return """
-- Drop existing CRM tables if they exist
DROP TABLE IF EXISTS crm_activity CASCADE;
DROP TABLE IF EXISTS crm_contact CASCADE;
DROP TABLE IF EXISTS crm_customer CASCADE;
DROP TABLE IF EXISTS crm_lead CASCADE;
DROP TABLE IF EXISTS crm_note CASCADE;

-- Create the crm_contact table
CREATE TABLE crm_contact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(100),
    job_title VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the crm_lead table
CREATE TABLE crm_lead (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(50) NOT NULL,
    source VARCHAR(50),
    value DECIMAL(19, 4),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    contact_id UUID NOT NULL REFERENCES crm_contact(id) ON DELETE CASCADE,
    assigned_to_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the crm_customer table
CREATE TABLE crm_customer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    contact_id UUID NOT NULL REFERENCES crm_contact(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Create the crm_activity table
CREATE TABLE crm_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    contact_id UUID REFERENCES crm_contact(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES crm_lead(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES crm_customer(id) ON DELETE CASCADE,
    assigned_to_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the crm_note table
CREATE TABLE crm_note (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    contact_id UUID REFERENCES crm_contact(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES crm_lead(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES crm_customer(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Add content types for CRM models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('crm', 'contact'),
    ('crm', 'lead'),
    ('crm', 'customer'),
    ('crm', 'activity'),
    ('crm', 'note')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark CRM migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('crm', '0001_initial', NOW()),
    ('crm', '0002_initial', NOW())
ON CONFLICT DO NOTHING;
"""
    elif app_name == 'hr':
        return """
-- Drop existing HR tables if they exist
DROP TABLE IF EXISTS hr_employee CASCADE;
DROP TABLE IF EXISTS hr_department CASCADE;
DROP TABLE IF EXISTS hr_payroll CASCADE;

-- Create the hr_department table
CREATE TABLE hr_department (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the hr_employee table
CREATE TABLE hr_employee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(20),
    position VARCHAR(100),
    hire_date DATE,
    employment_type VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    department_id UUID REFERENCES hr_department(id) ON DELETE SET NULL,
    user_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the hr_payroll table
CREATE TABLE hr_payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    gross_amount DECIMAL(19, 4) NOT NULL,
    net_amount DECIMAL(19, 4) NOT NULL,
    tax_amount DECIMAL(19, 4) NOT NULL,
    employee_id UUID NOT NULL REFERENCES hr_employee(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Add content types for HR models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('hr', 'department'),
    ('hr', 'employee'),
    ('hr', 'payroll')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark HR migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('hr', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
"""
    elif app_name == 'users':
        return """
-- Drop existing Users tables if they exist
DROP TABLE IF EXISTS users_userprofile CASCADE;
DROP TABLE IF EXISTS users_business CASCADE;
DROP TABLE IF EXISTS users_businessmember CASCADE;
DROP TABLE IF EXISTS users_notification CASCADE;

-- Create the users_business table
CREATE TABLE users_business (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    founded_date DATE,
    website VARCHAR(200),
    description TEXT,
    logo VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the users_userprofile table
CREATE TABLE users_userprofile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bio TEXT,
    profile_picture VARCHAR(255),
    phone_number VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    job_title VARCHAR(100),
    department VARCHAR(100),
    date_of_birth DATE,
    preferred_language VARCHAR(10),
    timezone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    business_id UUID REFERENCES users_business(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the users_businessmember table
CREATE TABLE users_businessmember (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    joined_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES users_business(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Create the users_notification table
CREATE TABLE users_notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    notification_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Add content types for Users models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('users', 'userprofile'),
    ('users', 'business'),
    ('users', 'businessmember'),
    ('users', 'notification')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Users migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('users', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
"""
    elif app_name == 'purchases':
        return """
-- Drop existing Purchases tables if they exist
DROP TABLE IF EXISTS purchases_purchaseorderitem CASCADE;
DROP TABLE IF EXISTS purchases_purchaseorder CASCADE;
DROP TABLE IF EXISTS purchases_supplier CASCADE;

-- Create the purchases_supplier table
CREATE TABLE purchases_supplier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(254),
    phone VARCHAR(20),
    address TEXT,
    contact_person VARCHAR(255),
    website VARCHAR(255),
    tax_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the purchases_purchaseorder table
CREATE TABLE purchases_purchaseorder (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL,
    order_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expected_delivery_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL,
    subtotal DECIMAL(19, 4) NOT NULL,
    tax DECIMAL(19, 4) NOT NULL,
    total DECIMAL(19, 4) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    supplier_id UUID NOT NULL REFERENCES purchases_supplier(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the purchases_purchaseorderitem table
CREATE TABLE purchases_purchaseorderitem (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(19, 4) NOT NULL,
    total_price DECIMAL(19, 4) NOT NULL,
    purchase_order_id UUID NOT NULL REFERENCES purchases_purchaseorder(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Add content types for Purchases models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('purchases', 'supplier'),
    ('purchases', 'purchaseorder'),
    ('purchases', 'purchaseorderitem')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Purchases migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('purchases', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
"""
    elif app_name == 'finance':
        return """
-- Drop existing Finance tables if they exist
DROP TABLE IF EXISTS finance_transaction CASCADE;
DROP TABLE IF EXISTS finance_account CASCADE;
DROP TABLE IF EXISTS finance_accounttype CASCADE;
DROP TABLE IF EXISTS finance_accountreconciliation CASCADE;

-- Create the finance_accounttype table
CREATE TABLE finance_accounttype (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    account_type_id INTEGER UNIQUE NULL,
    UNIQUE (name, account_type_id)
);

-- Create the finance_account table
CREATE TABLE finance_account (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    description TEXT,
    balance DECIMAL(19, 4) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    account_type_id INTEGER NOT NULL REFERENCES finance_accounttype(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Create the finance_transaction table
CREATE TABLE finance_transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    reference_number VARCHAR(100),
    transaction_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    from_account_id UUID NULL REFERENCES finance_account(id) ON DELETE SET NULL,
    to_account_id UUID NULL REFERENCES finance_account(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the finance_accountreconciliation table
CREATE TABLE finance_accountreconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    beginning_balance DECIMAL(19, 4) NOT NULL,
    ending_balance DECIMAL(19, 4) NOT NULL,
    is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    reconciled_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    account_id UUID NOT NULL REFERENCES finance_account(id) ON DELETE CASCADE,
    reconciled_by_id UUID NULL REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    approved_by_id UUID NULL REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    reviewed_by_id UUID NULL REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Add content types for Finance models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('finance', 'accounttype'),
    ('finance', 'account'),
    ('finance', 'transaction'),
    ('finance', 'accountreconciliation')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Finance migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('finance', '0001_initial', NOW())
ON CONFLICT DO NOTHING;

-- Insert default account types
INSERT INTO finance_accounttype (name, account_type_id) VALUES 
('Asset', 1),
('Liability', 2),
('Equity', 3),
('Revenue', 4),
('Expense', 5)
ON CONFLICT DO NOTHING;
"""
    elif app_name == 'sales':
        return """
-- Drop existing Sales tables if they exist
DROP TABLE IF EXISTS sales_invoiceitem CASCADE;
DROP TABLE IF EXISTS sales_invoice CASCADE;
DROP TABLE IF EXISTS sales_salesorderitem CASCADE;
DROP TABLE IF EXISTS sales_salesorder CASCADE;
DROP TABLE IF EXISTS sales_estimateitem CASCADE;
DROP TABLE IF EXISTS sales_estimate CASCADE;
DROP TABLE IF EXISTS sales_product CASCADE;
DROP TABLE IF EXISTS sales_tax CASCADE;

-- Create the sales_tax table
CREATE TABLE sales_tax (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    rate DECIMAL(5, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the sales_product table
CREATE TABLE sales_product (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    unit_price DECIMAL(19, 4) NOT NULL,
    cost_price DECIMAL(19, 4),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tax_id UUID REFERENCES sales_tax(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the sales_estimate table
CREATE TABLE sales_estimate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_number VARCHAR(50) NOT NULL,
    estimate_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL,
    subtotal DECIMAL(19, 4) NOT NULL,
    tax_total DECIMAL(19, 4) NOT NULL,
    total DECIMAL(19, 4) NOT NULL,
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    customer_id UUID REFERENCES crm_customer(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the sales_estimateitem table
CREATE TABLE sales_estimateitem (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(19, 4) NOT NULL,
    tax_rate DECIMAL(5, 2),
    tax_amount DECIMAL(19, 4),
    total DECIMAL(19, 4) NOT NULL,
    estimate_id UUID NOT NULL REFERENCES sales_estimate(id) ON DELETE CASCADE,
    product_id UUID REFERENCES sales_product(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the sales_salesorder table
CREATE TABLE sales_salesorder (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL,
    order_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL,
    subtotal DECIMAL(19, 4) NOT NULL,
    tax_total DECIMAL(19, 4) NOT NULL,
    total DECIMAL(19, 4) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    customer_id UUID REFERENCES crm_customer(id) ON DELETE SET NULL,
    estimate_id UUID REFERENCES sales_estimate(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the sales_salesorderitem table
CREATE TABLE sales_salesorderitem (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(19, 4) NOT NULL,
    tax_rate DECIMAL(5, 2),
    tax_amount DECIMAL(19, 4),
    total DECIMAL(19, 4) NOT NULL,
    sales_order_id UUID NOT NULL REFERENCES sales_salesorder(id) ON DELETE CASCADE,
    product_id UUID REFERENCES sales_product(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the sales_invoice table
CREATE TABLE sales_invoice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL,
    subtotal DECIMAL(19, 4) NOT NULL,
    tax_total DECIMAL(19, 4) NOT NULL,
    total DECIMAL(19, 4) NOT NULL,
    amount_paid DECIMAL(19, 4) NOT NULL DEFAULT 0,
    balance_due DECIMAL(19, 4) NOT NULL,
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    customer_id UUID REFERENCES crm_customer(id) ON DELETE SET NULL,
    sales_order_id UUID REFERENCES sales_salesorder(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    accounts_receivable_id UUID REFERENCES finance_account(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the sales_invoiceitem table
CREATE TABLE sales_invoiceitem (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(19, 4) NOT NULL,
    tax_rate DECIMAL(5, 2),
    tax_amount DECIMAL(19, 4),
    total DECIMAL(19, 4) NOT NULL,
    invoice_id UUID NOT NULL REFERENCES sales_invoice(id) ON DELETE CASCADE,
    product_id UUID REFERENCES sales_product(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Add content types for Sales models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('sales', 'tax'),
    ('sales', 'product'),
    ('sales', 'estimate'),
    ('sales', 'estimateitem'),
    ('sales', 'salesorder'),
    ('sales', 'salesorderitem'),
    ('sales', 'invoice'),
    ('sales', 'invoiceitem')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Sales migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('sales', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
"""
    elif app_name == 'integrations':
        return """
-- Drop existing Integrations tables if they exist
DROP TABLE IF EXISTS integrations_integration CASCADE;
DROP TABLE IF EXISTS integrations_integrationconnection CASCADE;

-- Create the integrations_integration table
CREATE TABLE integrations_integration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    integration_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the integrations_integrationconnection table
CREATE TABLE integrations_integrationconnection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token TEXT NULL,
    refresh_token TEXT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NULL,
    connection_data JSONB NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    integration_id UUID NOT NULL REFERENCES integrations_integration(id) ON DELETE CASCADE,
    user_profile_id UUID REFERENCES users_userprofile(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Add content types for Integrations models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('integrations', 'integration'),
    ('integrations', 'integrationconnection')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Integrations migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('integrations', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
"""
    elif app_name == 'onboarding':
        return """
-- Drop existing Onboarding tables if they exist
DROP TABLE IF EXISTS onboarding_onboardingstatus CASCADE;

-- Create the onboarding_onboardingstatus table
CREATE TABLE onboarding_onboardingstatus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(50) NOT NULL,
    completed_steps JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_step VARCHAR(100),
    progress INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Add content types for Onboarding models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('onboarding', 'onboardingstatus')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Onboarding migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('onboarding', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
"""
    elif app_name == 'reports':
        return """
-- Drop existing Reports tables if they exist
DROP TABLE IF EXISTS reports_report CASCADE;
DROP TABLE IF EXISTS reports_reportschedule CASCADE;

-- Create the reports_report table
CREATE TABLE reports_report (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    results JSONB,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_profile_id UUID REFERENCES users_userprofile(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Create the reports_reportschedule table
CREATE TABLE reports_reportschedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frequency VARCHAR(50) NOT NULL,
    next_run TIMESTAMP WITH TIME ZONE NOT NULL,
    recipients JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    report_id UUID NOT NULL REFERENCES reports_report(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Add content types for Reports models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('reports', 'report'),
    ('reports', 'reportschedule')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Reports migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('reports', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
"""
    elif app_name == 'socialaccount':
        return """
-- Drop existing Social Account tables if they exist
DROP TABLE IF EXISTS socialaccount_socialtoken CASCADE;
DROP TABLE IF EXISTS socialaccount_socialaccount CASCADE;
DROP TABLE IF EXISTS socialaccount_socialapp_sites CASCADE;
DROP TABLE IF EXISTS socialaccount_socialapp CASCADE;

-- Create the socialaccount_socialapp table
CREATE TABLE socialaccount_socialapp (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(30) NOT NULL,
    name VARCHAR(40) NOT NULL,
    client_id VARCHAR(191) NOT NULL,
    secret VARCHAR(191) NOT NULL,
    key VARCHAR(191) NOT NULL
);

-- Create the socialaccount_socialapp_sites table
CREATE TABLE socialaccount_socialapp_sites (
    id SERIAL PRIMARY KEY,
    socialapp_id INTEGER NOT NULL REFERENCES socialaccount_socialapp(id) ON DELETE CASCADE,
    site_id INTEGER NOT NULL REFERENCES django_site(id) ON DELETE CASCADE,
    UNIQUE (socialapp_id, site_id)
);

-- Create the socialaccount_socialaccount table
CREATE TABLE socialaccount_socialaccount (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(30) NOT NULL,
    uid VARCHAR(191) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE NOT NULL,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL,
    extra_data TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    UNIQUE (provider, uid)
);

-- Create the socialaccount_socialtoken table
CREATE TABLE socialaccount_socialtoken (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL,
    token_secret VARCHAR(200) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    account_id INTEGER NOT NULL REFERENCES socialaccount_socialaccount(id) ON DELETE CASCADE,
    app_id INTEGER NOT NULL REFERENCES socialaccount_socialapp(id) ON DELETE CASCADE,
    UNIQUE (account_id, app_id)
);

-- Add content types for Social Account models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('socialaccount', 'socialapp'),
    ('socialaccount', 'socialtoken'),
    ('socialaccount', 'socialaccount'),
    ('socialaccount', 'socialapp_sites')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Social Account migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('socialaccount', '0001_initial', NOW()),
    ('socialaccount', '0002_token_max_lengths', NOW()),
    ('socialaccount', '0003_extra_data_default_dict', NOW())
ON CONFLICT DO NOTHING;
"""
    elif app_name == 'taxes':
        return """
-- Drop existing Taxes tables if they exist
DROP TABLE IF EXISTS taxes_taxpayment CASCADE;
DROP TABLE IF EXISTS taxes_taxform CASCADE;
DROP TABLE IF EXISTS taxes_taxauthority CASCADE;

-- Create the taxes_taxauthority table
CREATE TABLE taxes_taxauthority (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(100) NOT NULL,
    tax_id_format VARCHAR(100),
    website VARCHAR(255),
    contact_email VARCHAR(254),
    contact_phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the taxes_taxform table
CREATE TABLE taxes_taxform (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_number VARCHAR(50) NOT NULL,
    form_name VARCHAR(255) NOT NULL,
    tax_year INTEGER NOT NULL,
    filing_status VARCHAR(50),
    due_date DATE,
    extended_due_date DATE,
    status VARCHAR(50) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    attachment VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    authority_id UUID NOT NULL REFERENCES taxes_taxauthority(id) ON DELETE CASCADE,
    prepared_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    verified_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the taxes_taxpayment table
CREATE TABLE taxes_taxpayment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_date DATE NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    confirmation_number VARCHAR(100),
    payment_period_start DATE,
    payment_period_end DATE,
    is_estimated BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tax_form_id UUID REFERENCES taxes_taxform(id) ON DELETE SET NULL,
    authority_id UUID NOT NULL REFERENCES taxes_taxauthority(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    account_id UUID REFERENCES finance_account(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Add content types for Taxes models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('taxes', 'taxauthority'),
    ('taxes', 'taxform'),
    ('taxes', 'taxpayment')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Taxes migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('taxes', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
"""
    elif app_name == 'token_blacklist':
        return """
-- Drop existing Token Blacklist tables if they exist
DROP TABLE IF EXISTS token_blacklist_outstandingtoken CASCADE;
DROP TABLE IF EXISTS token_blacklist_blacklistedtoken CASCADE;

-- Create the token_blacklist_outstandingtoken table
CREATE TABLE token_blacklist_outstandingtoken (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    jti VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE
);

-- Create the token_blacklist_blacklistedtoken table
CREATE TABLE token_blacklist_blacklistedtoken (
    id SERIAL PRIMARY KEY,
    blacklisted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    token_id INTEGER NOT NULL UNIQUE REFERENCES token_blacklist_outstandingtoken(id) ON DELETE CASCADE
);

-- Add content types for Token Blacklist models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('token_blacklist', 'outstandingtoken'),
    ('token_blacklist', 'blacklistedtoken')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Token Blacklist migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('token_blacklist', '0001_initial', NOW()),
    ('token_blacklist', '0002_outstandingtoken_jti_hex', NOW()),
    ('token_blacklist', '0003_auto_20171017_2007', NOW()),
    ('token_blacklist', '0004_auto_20171017_2013', NOW()),
    ('token_blacklist', '0005_remove_outstandingtoken_jti', NOW()),
    ('token_blacklist', '0006_auto_20171017_2113', NOW()),
    ('token_blacklist', '0007_auto_20171017_2214', NOW()),
    ('token_blacklist', '0008_migrate_to_bigautofield', NOW()),
    ('token_blacklist', '0010_fix_migrate_to_bigautofield', NOW()),
    ('token_blacklist', '0011_linearizes_history', NOW()),
    ('token_blacklist', '0012_alter_outstandingtoken_user', NOW())
ON CONFLICT DO NOTHING;
"""
    elif app_name == 'transport':
        return """
-- Drop existing Transport tables if they exist
DROP TABLE IF EXISTS transport_deliverylog CASCADE;
DROP TABLE IF EXISTS transport_delivery CASCADE;
DROP TABLE IF EXISTS transport_vehicle CASCADE;
DROP TABLE IF EXISTS transport_driver CASCADE;

-- Create the transport_driver table
CREATE TABLE transport_driver (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_number VARCHAR(100) NOT NULL,
    license_expiry DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL
);

-- Create the transport_vehicle table
CREATE TABLE transport_vehicle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    capacity DECIMAL(10, 2),
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Create the transport_delivery table
CREATE TABLE transport_delivery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    pickup_time TIMESTAMP WITH TIME ZONE NOT NULL,
    delivery_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    driver_id UUID REFERENCES transport_driver(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES transport_vehicle(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Create the transport_deliverylog table
CREATE TABLE transport_deliverylog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL,
    location_lat DECIMAL(10, 7),
    location_lng DECIMAL(10, 7),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    delivery_id UUID NOT NULL REFERENCES transport_delivery(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL
);

-- Add content types for Transport models
INSERT INTO django_content_type (app_label, model)
VALUES 
    ('transport', 'driver'),
    ('transport', 'vehicle'),
    ('transport', 'delivery'),
    ('transport', 'deliverylog')
ON CONFLICT (app_label, model) DO NOTHING;

-- Mark Transport migrations as applied
INSERT INTO django_migrations (app, name, applied)
VALUES 
    ('transport', '0001_initial', NOW())
ON CONFLICT DO NOTHING;
"""
    else:
        return f"-- No SQL template for app: {app_name}"

def main():
    parser = argparse.ArgumentParser(description='Generate SQL for app with UUID fields.')
    parser.add_argument('app_name', help='Name of the Django app to generate SQL for')
    args = parser.parse_args()
    
    sql = generate_sql_for_app(args.app_name)
    
    # Create the SQL file
    output_file = f'setup_{args.app_name}_tables.sql'
    with open(output_file, 'w') as f:
        f.write(sql)
        
    print(f"SQL script generated in {output_file}")

if __name__ == '__main__':
    main() 
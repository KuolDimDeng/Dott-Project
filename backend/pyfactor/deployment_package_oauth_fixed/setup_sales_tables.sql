
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

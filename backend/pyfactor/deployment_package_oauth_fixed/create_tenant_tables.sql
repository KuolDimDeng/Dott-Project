-- Finance Tables
CREATE TABLE IF NOT EXISTS finance_account (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    balance DECIMAL(19, 4) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_financetransaction (
    id UUID PRIMARY KEY,
    transaction_type VARCHAR(20) NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    description TEXT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    account_id UUID NOT NULL REFERENCES finance_account(id),
    tenant_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_budget (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Sales Tables
CREATE TABLE IF NOT EXISTS sales_customer (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NULL,
    phone VARCHAR(20) NULL,
    address TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_invoice (
    id UUID PRIMARY KEY,
    invoice_number VARCHAR(20) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    customer_id UUID NOT NULL REFERENCES sales_customer(id),
    tenant_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_invoiceitem (
    id UUID PRIMARY KEY,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(19, 4) NOT NULL,
    total_price DECIMAL(19, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    invoice_id UUID NOT NULL REFERENCES sales_invoice(id),
    tenant_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_salesorder (
    id UUID PRIMARY KEY,
    order_number VARCHAR(20) NOT NULL,
    order_date DATE NOT NULL,
    delivery_date DATE NULL,
    total_amount DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    customer_id UUID NOT NULL REFERENCES sales_customer(id),
    tenant_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_salesorderitem (
    id UUID PRIMARY KEY,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(19, 4) NOT NULL,
    total_price DECIMAL(19, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sales_order_id UUID NOT NULL REFERENCES sales_salesorder(id),
    tenant_id UUID NOT NULL
);

-- Inventory Tables
CREATE TABLE IF NOT EXISTS inventory_product (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    description TEXT NULL,
    price DECIMAL(19, 4) NOT NULL,
    cost DECIMAL(19, 4) NOT NULL,
    quantity_in_stock INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_category (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_product_categories (
    id SERIAL PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES inventory_product(id),
    category_id UUID NOT NULL REFERENCES inventory_category(id),
    CONSTRAINT inventory_product_categories_unique UNIQUE (product_id, category_id)
);

-- Enable Row Level Security on all tenant-aware tables
ALTER TABLE finance_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_financetransaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoiceitem ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_salesorder ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_salesorderitem ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_product ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_category ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tenant-aware tables
CREATE POLICY tenant_isolation_policy ON finance_account USING (tenant_id = current_setting('app.current_tenant_id')::uuid OR current_setting('app.current_tenant_id', TRUE) IS NULL);
CREATE POLICY tenant_isolation_policy ON finance_financetransaction USING (tenant_id = current_setting('app.current_tenant_id')::uuid OR current_setting('app.current_tenant_id', TRUE) IS NULL);
CREATE POLICY tenant_isolation_policy ON finance_budget USING (tenant_id = current_setting('app.current_tenant_id')::uuid OR current_setting('app.current_tenant_id', TRUE) IS NULL);
CREATE POLICY tenant_isolation_policy ON sales_customer USING (tenant_id = current_setting('app.current_tenant_id')::uuid OR current_setting('app.current_tenant_id', TRUE) IS NULL);
CREATE POLICY tenant_isolation_policy ON sales_invoice USING (tenant_id = current_setting('app.current_tenant_id')::uuid OR current_setting('app.current_tenant_id', TRUE) IS NULL);
CREATE POLICY tenant_isolation_policy ON sales_invoiceitem USING (tenant_id = current_setting('app.current_tenant_id')::uuid OR current_setting('app.current_tenant_id', TRUE) IS NULL);
CREATE POLICY tenant_isolation_policy ON sales_salesorder USING (tenant_id = current_setting('app.current_tenant_id')::uuid OR current_setting('app.current_tenant_id', TRUE) IS NULL);
CREATE POLICY tenant_isolation_policy ON sales_salesorderitem USING (tenant_id = current_setting('app.current_tenant_id')::uuid OR current_setting('app.current_tenant_id', TRUE) IS NULL);
CREATE POLICY tenant_isolation_policy ON inventory_product USING (tenant_id = current_setting('app.current_tenant_id')::uuid OR current_setting('app.current_tenant_id', TRUE) IS NULL);
CREATE POLICY tenant_isolation_policy ON inventory_category USING (tenant_id = current_setting('app.current_tenant_id')::uuid OR current_setting('app.current_tenant_id', TRUE) IS NULL); 
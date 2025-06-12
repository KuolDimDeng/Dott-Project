-- Apply Row Level Security to all Sales and related tables

-- Enable RLS on all sales tables
ALTER TABLE sales_tax ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_product ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_estimate ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_estimateitem ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_estimateattachment ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_salesorder ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_salesorderitem ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoiceitem ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_sale ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_saleitem ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_refund ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_refunditem ENABLE ROW LEVEL SECURITY;

-- Enable RLS on CRM customer table
ALTER TABLE crm_customer ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS sales_tax_tenant_isolation ON sales_tax;
DROP POLICY IF EXISTS sales_product_tenant_isolation ON sales_product;
DROP POLICY IF EXISTS sales_estimate_tenant_isolation ON sales_estimate;
DROP POLICY IF EXISTS sales_estimateitem_tenant_isolation ON sales_estimateitem;
DROP POLICY IF EXISTS sales_estimateattachment_tenant_isolation ON sales_estimateattachment;
DROP POLICY IF EXISTS sales_salesorder_tenant_isolation ON sales_salesorder;
DROP POLICY IF EXISTS sales_salesorderitem_tenant_isolation ON sales_salesorderitem;
DROP POLICY IF EXISTS sales_invoice_tenant_isolation ON sales_invoice;
DROP POLICY IF EXISTS sales_invoiceitem_tenant_isolation ON sales_invoiceitem;
DROP POLICY IF EXISTS sales_sale_tenant_isolation ON sales_sale;
DROP POLICY IF EXISTS sales_saleitem_tenant_isolation ON sales_saleitem;
DROP POLICY IF EXISTS sales_refund_tenant_isolation ON sales_refund;
DROP POLICY IF EXISTS sales_refunditem_tenant_isolation ON sales_refunditem;
DROP POLICY IF EXISTS crm_customer_tenant_isolation ON crm_customer;

-- Create new policies
CREATE POLICY sales_tax_tenant_isolation ON sales_tax
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY sales_product_tenant_isolation ON sales_product
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY sales_estimate_tenant_isolation ON sales_estimate
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY sales_estimateitem_tenant_isolation ON sales_estimateitem
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY sales_estimateattachment_tenant_isolation ON sales_estimateattachment
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY sales_salesorder_tenant_isolation ON sales_salesorder
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY sales_salesorderitem_tenant_isolation ON sales_salesorderitem
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY sales_invoice_tenant_isolation ON sales_invoice
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY sales_invoiceitem_tenant_isolation ON sales_invoiceitem
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY sales_sale_tenant_isolation ON sales_sale
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY sales_saleitem_tenant_isolation ON sales_saleitem
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY sales_refund_tenant_isolation ON sales_refund
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY sales_refunditem_tenant_isolation ON sales_refunditem
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY crm_customer_tenant_isolation ON crm_customer
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Grant necessary permissions to the database user
-- Replace 'your_db_user' with your actual database user
GRANT ALL ON sales_tax TO your_db_user;
GRANT ALL ON sales_product TO your_db_user;
GRANT ALL ON sales_estimate TO your_db_user;
GRANT ALL ON sales_estimateitem TO your_db_user;
GRANT ALL ON sales_estimateattachment TO your_db_user;
GRANT ALL ON sales_salesorder TO your_db_user;
GRANT ALL ON sales_salesorderitem TO your_db_user;
GRANT ALL ON sales_invoice TO your_db_user;
GRANT ALL ON sales_invoiceitem TO your_db_user;
GRANT ALL ON sales_sale TO your_db_user;
GRANT ALL ON sales_saleitem TO your_db_user;
GRANT ALL ON sales_refund TO your_db_user;
GRANT ALL ON sales_refunditem TO your_db_user;
GRANT ALL ON crm_customer TO your_db_user;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_tax_tenant_id ON sales_tax(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_tenant_id ON sales_product(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_estimate_tenant_id ON sales_estimate(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_estimateitem_tenant_id ON sales_estimateitem(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_estimateattachment_tenant_id ON sales_estimateattachment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_salesorder_tenant_id ON sales_salesorder(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_salesorderitem_tenant_id ON sales_salesorderitem(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_tenant_id ON sales_invoice(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoiceitem_tenant_id ON sales_invoiceitem(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_tenant_id ON sales_sale(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_saleitem_tenant_id ON sales_saleitem(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_refund_tenant_id ON sales_refund(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_refunditem_tenant_id ON sales_refunditem(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_customer_tenant_id ON crm_customer(tenant_id);
-- Setup Row-Level Security (RLS) Policies for Tenant Isolation
-- This ensures that users can only access data from their own tenant

-- Enable RLS on all relevant tables
ALTER TABLE custom_auth_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_auth_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_onboardingprogress ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_product ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS tenant_isolation_policy ON custom_auth_user;
DROP POLICY IF EXISTS tenant_isolation_policy ON custom_auth_tenant;
DROP POLICY IF EXISTS tenant_isolation_policy ON onboarding_onboardingprogress;
DROP POLICY IF EXISTS tenant_isolation_policy ON hr_employee;
DROP POLICY IF EXISTS tenant_isolation_policy ON finance_transaction;
DROP POLICY IF EXISTS tenant_isolation_policy ON sales_invoice;
DROP POLICY IF EXISTS tenant_isolation_policy ON inventory_product;

-- Create function to get current tenant ID
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    -- Try to get tenant ID from session variable
    RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for users table
CREATE POLICY tenant_isolation_policy ON custom_auth_user
    FOR ALL
    USING (
        -- Users can only see their own record
        auth0_sub = current_setting('app.current_user_email', true)
        OR email = current_setting('app.current_user_email', true)
        OR tenant_id = current_tenant_id()
    );

-- Policy for tenants table
CREATE POLICY tenant_isolation_policy ON custom_auth_tenant
    FOR ALL
    USING (
        -- Users can only see their own tenant
        id = current_tenant_id()
        OR owner_id = current_setting('app.current_user_email', true)
    );

-- Policy for onboarding progress
CREATE POLICY tenant_isolation_policy ON onboarding_onboardingprogress
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
    );

-- Policy for employees
CREATE POLICY tenant_isolation_policy ON hr_employee
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
    );

-- Policy for financial transactions
CREATE POLICY tenant_isolation_policy ON finance_transaction
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
    );

-- Policy for sales invoices
CREATE POLICY tenant_isolation_policy ON sales_invoice
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
    );

-- Policy for inventory products
CREATE POLICY tenant_isolation_policy ON inventory_product
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_tenant_id ON custom_auth_user(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_auth0_sub ON custom_auth_user(auth0_sub);
CREATE INDEX IF NOT EXISTS idx_tenant_owner_id ON custom_auth_tenant(owner_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tenant_id ON onboarding_onboardingprogress(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_tenant_id ON hr_employee(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tenant_id ON finance_transaction(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tenant_id ON sales_invoice(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_tenant_id ON inventory_product(tenant_id);

-- Add check constraint to ensure tenant_id is never null for critical tables
ALTER TABLE hr_employee ADD CONSTRAINT chk_employee_tenant_id CHECK (tenant_id IS NOT NULL);
ALTER TABLE finance_transaction ADD CONSTRAINT chk_transaction_tenant_id CHECK (tenant_id IS NOT NULL);
ALTER TABLE sales_invoice ADD CONSTRAINT chk_invoice_tenant_id CHECK (tenant_id IS NOT NULL);
ALTER TABLE inventory_product ADD CONSTRAINT chk_product_tenant_id CHECK (tenant_id IS NOT NULL);
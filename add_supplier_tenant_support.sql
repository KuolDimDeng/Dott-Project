-- Add tenant support to the inventory_supplier table

-- 1. Add the tenant_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'inventory_supplier' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE inventory_supplier ADD COLUMN tenant_id UUID REFERENCES tenant(id);
    END IF;
END $$;

-- 2. Add created_at and updated_at columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'inventory_supplier' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE inventory_supplier ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'inventory_supplier' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE inventory_supplier ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 3. Add is_active column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'inventory_supplier' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE inventory_supplier ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 4. Create an index on tenant_id and name
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'inventory_supplier' AND indexname = 'inventory_supplier_tenant_id_name_idx'
    ) THEN
        CREATE INDEX inventory_supplier_tenant_id_name_idx ON inventory_supplier(tenant_id, name);
    END IF;
END $$;

-- 5. Update existing records to assign tenant_id from related inventory items
-- This assumes that suppliers are related to inventory_items that already have tenant_id
UPDATE inventory_supplier s
SET tenant_id = (
    SELECT DISTINCT i.tenant_id 
    FROM inventory_item i 
    WHERE i.supplier_id = s.id 
    LIMIT 1
)
WHERE s.tenant_id IS NULL;

-- 6. Optional: Add RLS policy for the inventory_supplier table
-- Only if RLS is enabled on the database
DO $$ 
BEGIN
    -- Check if RLS is enabled
    IF EXISTS (
        SELECT 1 FROM pg_settings WHERE name = 'row_security' AND setting = 'on'
    ) THEN
        -- Enable RLS on the table
        ALTER TABLE inventory_supplier ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for tenant isolation
        DROP POLICY IF EXISTS tenant_isolation_policy ON inventory_supplier;
        CREATE POLICY tenant_isolation_policy ON inventory_supplier
            USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- If table doesn't exist or other error, just log it
        RAISE NOTICE 'Could not add RLS policy to inventory_supplier table';
END $$; 
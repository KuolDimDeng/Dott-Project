
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

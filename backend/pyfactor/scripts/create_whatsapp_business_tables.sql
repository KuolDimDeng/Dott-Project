-- SQL script to manually create WhatsApp Business tables
-- Run this if Django migrations fail to apply automatically

-- Create whatsapp_business_settings table
CREATE TABLE IF NOT EXISTS whatsapp_business_settings (
    id BIGSERIAL PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT TRUE,
    business_name VARCHAR(255),
    business_description TEXT,
    whatsapp_number VARCHAR(20),
    welcome_message TEXT DEFAULT 'Welcome to our business! Browse our catalog and shop with ease.',
    auto_reply_enabled BOOLEAN DEFAULT TRUE,
    catalog_enabled BOOLEAN DEFAULT TRUE,
    payment_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL UNIQUE,
    CONSTRAINT fk_whatsapp_business_settings_tenant
        FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) 
        ON DELETE CASCADE
);

-- Create whatsapp_catalogs table
CREATE TABLE IF NOT EXISTS whatsapp_catalogs (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    catalog_url VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL,
    CONSTRAINT fk_whatsapp_catalogs_tenant
        FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) 
        ON DELETE CASCADE
);

-- Create whatsapp_products table
CREATE TABLE IF NOT EXISTS whatsapp_products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    item_type VARCHAR(20) DEFAULT 'product',
    price DECIMAL(10, 2) NOT NULL,
    price_type VARCHAR(20) DEFAULT 'fixed',
    currency VARCHAR(3) DEFAULT 'USD',
    image_url VARCHAR(200),
    sku VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    category VARCHAR(100),
    duration_minutes INTEGER,
    service_location VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    catalog_id BIGINT NOT NULL,
    linked_product_id BIGINT,
    CONSTRAINT fk_whatsapp_products_catalog
        FOREIGN KEY (catalog_id) 
        REFERENCES whatsapp_catalogs(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_whatsapp_products_linked_product
        FOREIGN KEY (linked_product_id) 
        REFERENCES inventory_product(id) 
        ON DELETE SET NULL
);

-- Create whatsapp_orders table
CREATE TABLE IF NOT EXISTS whatsapp_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255),
    customer_address TEXT,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    order_status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(20),
    payment_reference VARCHAR(100),
    payment_link VARCHAR(200),
    dott_fee_amount DECIMAL(10, 2) DEFAULT 0.00,
    dott_fee_currency VARCHAR(3) DEFAULT 'USD',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL,
    CONSTRAINT fk_whatsapp_orders_tenant
        FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) 
        ON DELETE CASCADE
);

-- Create whatsapp_order_items table
CREATE TABLE IF NOT EXISTS whatsapp_order_items (
    id BIGSERIAL PRIMARY KEY,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    order_id UUID NOT NULL,
    product_id BIGINT NOT NULL,
    CONSTRAINT fk_whatsapp_order_items_order
        FOREIGN KEY (order_id) 
        REFERENCES whatsapp_orders(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_whatsapp_order_items_product
        FOREIGN KEY (product_id) 
        REFERENCES whatsapp_products(id) 
        ON DELETE CASCADE
);

-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id BIGSERIAL PRIMARY KEY,
    recipient_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    message_content TEXT NOT NULL,
    whatsapp_message_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    related_order_id UUID,
    tenant_id UUID NOT NULL,
    CONSTRAINT fk_whatsapp_messages_order
        FOREIGN KEY (related_order_id) 
        REFERENCES whatsapp_orders(id) 
        ON DELETE SET NULL,
    CONSTRAINT fk_whatsapp_messages_tenant
        FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) 
        ON DELETE CASCADE
);

-- Create whatsapp_analytics table
CREATE TABLE IF NOT EXISTS whatsapp_analytics (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_read INTEGER DEFAULT 0,
    catalog_shares INTEGER DEFAULT 0,
    catalog_views INTEGER DEFAULT 0,
    orders_initiated INTEGER DEFAULT 0,
    orders_completed INTEGER DEFAULT 0,
    orders_cancelled INTEGER DEFAULT 0,
    total_revenue DECIMAL(10, 2) DEFAULT 0.00,
    dott_fees_collected DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL,
    CONSTRAINT fk_whatsapp_analytics_tenant
        FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) 
        ON DELETE CASCADE,
    CONSTRAINT whatsapp_analytics_tenant_date_unique 
        UNIQUE (tenant_id, date)
);

-- Create indexes for better performance
CREATE INDEX idx_whatsapp_business_settings_tenant ON whatsapp_business_settings(tenant_id);
CREATE INDEX idx_whatsapp_catalogs_tenant ON whatsapp_catalogs(tenant_id);
CREATE INDEX idx_whatsapp_products_catalog ON whatsapp_products(catalog_id);
CREATE INDEX idx_whatsapp_orders_tenant ON whatsapp_orders(tenant_id);
CREATE INDEX idx_whatsapp_orders_status ON whatsapp_orders(order_status);
CREATE INDEX idx_whatsapp_order_items_order ON whatsapp_order_items(order_id);
CREATE INDEX idx_whatsapp_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX idx_whatsapp_analytics_tenant_date ON whatsapp_analytics(tenant_id, date);

-- Add trigger to update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_whatsapp_business_settings_updated_at BEFORE UPDATE ON whatsapp_business_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_catalogs_updated_at BEFORE UPDATE ON whatsapp_catalogs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_products_updated_at BEFORE UPDATE ON whatsapp_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_orders_updated_at BEFORE UPDATE ON whatsapp_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON whatsapp_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_analytics_updated_at BEFORE UPDATE ON whatsapp_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your setup)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Insert migration record to prevent Django from trying to run it again
INSERT INTO django_migrations (app, name, applied) 
VALUES ('whatsapp_business', '0001_initial', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
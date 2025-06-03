
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

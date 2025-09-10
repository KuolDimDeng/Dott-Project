-- Setup Staging Transport Scenario
-- This replicates the exact state causing staging failures

-- Create django_migrations table
CREATE TABLE IF NOT EXISTS django_migrations (
    id SERIAL PRIMARY KEY,
    app VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create transport tables with UUID foreign keys (like in staging)
CREATE TABLE IF NOT EXISTS transport_driver (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    license_number VARCHAR(100),
    vehicle_type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_expense (
    id SERIAL PRIMARY KEY,
    created_by_id UUID,
    description TEXT,
    amount DECIMAL(10, 2),
    date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_equipment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mark transport migrations 0001-0003 as applied (but NOT 0004)
INSERT INTO django_migrations (app, name, applied) VALUES 
('transport', '0001_ensure_base_tables', NOW()),
('transport', '0002_initial', NOW()),
('transport', '0003_add_transport_models', NOW())
ON CONFLICT DO NOTHING;

-- Verify the setup
\echo '=== STAGING SCENARIO VERIFICATION ==='
\echo 'Transport tables created:'
SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'transport_%';

\echo ''
\echo 'Column types:'
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('transport_driver', 'transport_expense') 
AND column_name IN ('user_id', 'created_by_id');

\echo ''
\echo 'Applied migrations:'
SELECT app, name FROM django_migrations WHERE app = 'transport' ORDER BY name;

\echo ''
\echo '=== STAGING SCENARIO READY ==='
\echo 'Tables exist with UUID foreign keys, but migration 0004 is NOT applied'
#!/bin/bash
# Setup Staging Database with Schema Only (No User Data)

echo "🚀 Setting up staging database..."
echo "This script will:"
echo "1. Copy production schema (structure only)"
echo "2. Create test users"
echo "3. Add sample data"
echo ""

# Check if DATABASE_URL is provided
if [ -z "$1" ]; then
    echo "❌ Usage: ./setup-staging-db.sh <STAGING_DATABASE_URL>"
    echo "Example: ./setup-staging-db.sh postgres://user:pass@host:5432/dbname"
    exit 1
fi

STAGING_DB_URL=$1
echo "📊 Using staging database: ${STAGING_DB_URL%%@*}@****"

# Step 1: Export production schema (structure only, no data)
echo ""
echo "📋 Step 1: Exporting production schema..."
if [ -z "$PRODUCTION_DATABASE_URL" ]; then
    echo "❌ Please set PRODUCTION_DATABASE_URL environment variable"
    exit 1
fi

pg_dump "$PRODUCTION_DATABASE_URL" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-publications \
    --no-subscriptions \
    > /tmp/production_schema.sql

echo "✅ Schema exported"

# Step 2: Import schema to staging
echo ""
echo "📥 Step 2: Importing schema to staging..."
psql "$STAGING_DB_URL" < /tmp/production_schema.sql

echo "✅ Schema imported"

# Step 3: Create test data
echo ""
echo "🧪 Step 3: Creating test data..."

cat > /tmp/staging_test_data.sql << 'EOF'
-- Create test users
INSERT INTO public.users (id, username, email, is_active, date_joined, onboarding_completed) VALUES
(uuid_generate_v4(), 'test_owner', 'owner@test.com', true, NOW(), true),
(uuid_generate_v4(), 'test_admin', 'admin@test.com', true, NOW(), true),
(uuid_generate_v4(), 'test_user', 'user@test.com', true, NOW(), true);

-- Create test businesses
INSERT INTO public.businesses_business (
    id, business_name, business_type, industry, annual_revenue, 
    employee_count, ein, country, currency, fiscal_year_start,
    fiscal_year_end, created_at, updated_at, is_active
) VALUES (
    uuid_generate_v4(), 
    'Test Company Inc', 
    'corporation', 
    'technology', 
    1000000.00,
    50, 
    '12-3456789', 
    'US', 
    'USD', 
    '2025-07-01',
    '2025-06-30', 
    NOW(), 
    NOW(), 
    true
);

-- Add more test data as needed
COMMIT;
EOF

psql "$STAGING_DB_URL" < /tmp/staging_test_data.sql

echo "✅ Test data created"

# Clean up
rm -f /tmp/production_schema.sql /tmp/staging_test_data.sql

echo ""
echo "🎉 Staging database setup complete!"
echo "   - Schema copied from production"
echo "   - Test users created (owner@test.com, admin@test.com, user@test.com)"
echo "   - Ready for testing!"
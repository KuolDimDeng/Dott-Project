#!/bin/bash
set -e
echo "Starting DB reset..."
python manage.py reset_db_main --no-input
echo "Creating banking tables directly..."
psql -U dott_admin -d dott_main -h dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com -c "CREATE TABLE IF NOT EXISTS banking_bankaccount (id UUID PRIMARY KEY, name VARCHAR(255) NOT NULL, account_number VARCHAR(100) NOT NULL, account_type VARCHAR(100) NOT NULL, balance DECIMAL(19, 4) NOT NULL, currency VARCHAR(3) NOT NULL, is_active BOOLEAN NOT NULL, created_at TIMESTAMP WITH TIME ZONE NOT NULL, updated_at TIMESTAMP WITH TIME ZONE NOT NULL, tenant_id UUID NOT NULL, user_id UUID);"
echo "Marking banking migrations as applied..."
export OVERRIDE_DB_ROUTER=True
python manage.py migrate banking --fake
echo "Applying core migrations first..."
python manage.py migrate contenttypes
python manage.py migrate auth
echo "Applying all migrations..."
python manage.py migrate --fake-initial
echo "Database reset complete!"

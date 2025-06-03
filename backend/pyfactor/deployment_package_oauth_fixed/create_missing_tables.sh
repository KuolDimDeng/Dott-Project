#!/bin/bash
set -e

echo "===== CREATING MISSING DATABASE TABLES ====="

# 1. Run the SQL script to create missing auth tables
export PGPASSWORD="RRfXU6uPPUbBEg1JqGTJ"
echo "Creating core auth tables directly..."
psql -U dott_admin -d dott_main -h dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com -f create_auth_tables.sql

echo "Creating additional Django tables directly..."
psql -U dott_admin -d dott_main -h dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com -f create_django_tables.sql

# 2. Apply the RLS policies to any newly created tables that have tenant_id
echo "Setting up RLS policies on new tables..."
python manage.py setup_rls_policies

# 3. Try running the fake migrations again
echo "Applying migrations with --fake-initial..."
python manage.py migrate --fake-initial

echo "===== COMPLETE ====="
echo "Now try running your application with the new tables in place." 
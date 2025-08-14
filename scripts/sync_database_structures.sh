#!/bin/bash
# Script to compare and sync database structures between staging and production

echo "=== Database Structure Comparison Tool ==="
echo ""
echo "This script helps ensure staging and production databases have the same structure"
echo ""

cat << 'EOF'
# Step 1: Check migration status on both environments
echo "1. Check migrations on STAGING:"
# SSH to staging and run:
python manage.py showmigrations | grep "\[ \]"

echo "2. Check migrations on PRODUCTION:"
# SSH to production and run:
python manage.py showmigrations | grep "\[ \]"

# Step 2: Export schema from both databases
echo "3. Export STAGING schema:"
pg_dump --schema-only --no-owner --no-privileges staging_db_url > staging_schema.sql

echo "4. Export PRODUCTION schema:"
pg_dump --schema-only --no-owner --no-privileges production_db_url > production_schema.sql

# Step 3: Compare schemas
echo "5. Compare schemas:"
diff staging_schema.sql production_schema.sql > schema_differences.txt

# Step 4: Apply missing migrations to production
echo "6. Apply any missing migrations to production:"
python manage.py migrate --fake-initial

# Step 5: Fix migration conflicts if any
echo "7. If there are conflicts, fix them:"
python manage.py migrate --fake conflicting_app zero
python manage.py migrate conflicting_app

EOF

echo ""
echo "=== Quick Check Commands ==="
echo ""
echo "Run these on both staging and production to compare:"
echo ""
cat << 'EOF'
# Check POS transaction columns
python manage.py dbshell << SQL
\d sales_pos_transaction
SQL

# Check all tables
python manage.py dbshell << SQL
\dt
SQL

# Check specific migration status
python manage.py showmigrations sales
python manage.py showmigrations custom_auth
python manage.py showmigrations finance
EOF
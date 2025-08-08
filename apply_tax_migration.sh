#!/bin/bash

echo "🚀 Applying tax jurisdiction migration to production database..."

cd /Users/kuoldeng/projectx/backend/pyfactor

# Apply the specific migration
echo "📦 Applying migration 0011_add_tax_jurisdiction_fields..."
python3 manage.py migrate sales 0011_add_tax_jurisdiction_fields

# Check migration status
echo "✅ Checking migration status..."
python3 manage.py showmigrations sales | tail -5

echo "✨ Migration complete!"
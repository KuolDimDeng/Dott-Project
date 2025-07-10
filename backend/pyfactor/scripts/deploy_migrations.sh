#!/bin/bash
# Production deployment script for HR migrations
# This should be run as part of the deployment process on Render

echo "🚀 Starting HR migration deployment..."

# Exit on error
set -e

# Function to run Django command
run_django_command() {
    python manage.py "$@"
}

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo "❌ Error: manage.py not found. Please run this script from the Django project root."
    exit 1
fi

echo "📋 Checking migration status..."
run_django_command showmigrations hr

echo ""
echo "🔄 Applying pending migrations..."
run_django_command migrate hr --noinput

echo ""
echo "✅ Migrations applied successfully!"
echo ""
echo "🔍 Verifying critical columns..."

# Check specific columns using Django shell
python manage.py shell <<EOF
from hr.utils import check_column_exists
columns_to_check = [
    ('hr_employee', 'date_of_birth'),
    ('hr_employee', 'direct_deposit'),
    ('hr_employee', 'vacation_time'),
    ('hr_employee', 'vacation_days_per_year')
]

all_good = True
for table, column in columns_to_check:
    exists = check_column_exists(table, column)
    status = "✅" if exists else "❌"
    print(f"{status} {table}.{column}: {'exists' if exists else 'MISSING'}")
    if not exists:
        all_good = False

if not all_good:
    print("\n⚠️  Some columns are missing. Please check the migrations.")
else:
    print("\n✅ All required columns are present.")
EOF

echo ""
echo "🎉 Deployment migration check complete!"
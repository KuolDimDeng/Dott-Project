#!/bin/bash

# Script to run inventory database optimizations
# This script applies the SQL optimizations to improve database performance

echo "Starting inventory database optimizations..."
echo "============================================"

# Set environment variables if needed
export DJANGO_SETTINGS_MODULE=pyfactor.settings

# Change to the project directory
cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Run the optimization script
echo "Running database optimizations..."
python -m inventory.run_optimizations

# Check if the script was successful
if [ $? -eq 0 ]; then
    echo "✅ Database optimizations completed successfully!"
else
    echo "❌ Database optimizations failed. Check the logs for details."
    exit 1
fi

# Run Django shell command to verify indexes
echo "Verifying database indexes..."
python manage.py shell -c "
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute(\"\"\"
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'inventory_product'
    \"\"\")
    indexes = cursor.fetchall()
    for idx in indexes:
        print(f'- {idx[0]}: {idx[1]}')
"

echo "============================================"
echo "Optimization process completed."
echo "You can now use the optimized endpoints:"
echo "- /api/inventory/optimized/products/"
echo "- /api/inventory/optimized/products/summary/"
echo "- /api/inventory/optimized/products/<uuid:product_id>/"
echo "============================================"
#!/bin/bash

# Script to run enhanced inventory database and API optimizations
# This script applies the enhanced SQL optimizations and sets up the ultra-optimized endpoints

echo "Starting enhanced inventory optimization process..."
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

# Run the standard optimization script
echo "Running standard database optimizations..."
python -m inventory.run_optimizations

# Check if the script was successful
if [ $? -eq 0 ]; then
    echo "✅ Standard database optimizations completed successfully!"
else
    echo "❌ Standard database optimizations failed. Check the logs for details."
    exit 1
fi

# Run the enhanced SQL optimizations
echo "Running enhanced database optimizations..."
python -m inventory.enhanced_sql_optimizations

# Check if the script was successful
if [ $? -eq 0 ]; then
    echo "✅ Enhanced database optimizations completed successfully!"
else
    echo "❌ Enhanced database optimizations failed. Check the logs for details."
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

# Restart Django server to apply changes
echo "Restarting Django server to apply changes..."
if pgrep -f "python manage.py runserver" > /dev/null; then
    pkill -f "python manage.py runserver"
    echo "Django server stopped."
    nohup python manage.py runserver > /dev/null 2>&1 &
    echo "Django server restarted."
else
    echo "Django server not running, no need to restart."
fi

# Clear Django cache
echo "Clearing Django cache..."
python manage.py shell -c "
from django.core.cache import cache
cache.clear()
print('Django cache cleared successfully.')
"

echo "============================================"
echo "Enhanced optimization process completed."
echo "You can now use the optimized endpoints:"
echo "- /api/inventory/optimized/products/"
echo "- /api/inventory/optimized/products/summary/"
echo "- /api/inventory/optimized/products/<uuid:product_id>/"
echo ""
echo "And the ultra-optimized endpoints:"
echo "- /api/inventory/ultra/products/"
echo "- /api/inventory/ultra/products/with-department/"
echo "- /api/inventory/ultra/products/stats/"
echo "- /api/inventory/ultra/products/code/<str:product_code>/"
echo "============================================"
echo ""
echo "To verify the optimizations, you can run:"
echo "curl http://localhost:8000/api/inventory/ultra/products/"
echo "============================================"
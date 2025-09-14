#!/bin/bash

# Script to run menu migrations on Render
# This should be executed in the Render shell

echo "Running menu migrations..."
echo "=========================="

# Run migrations for the menu app
python manage.py migrate menu

echo ""
echo "Checking migration status..."
python manage.py showmigrations menu

echo ""
echo "Migration complete!"
echo ""
echo "You can now test the menu API by running:"
echo "python manage.py shell"
echo ">>> from menu.models import MenuItem"
echo ">>> MenuItem.objects.count()"
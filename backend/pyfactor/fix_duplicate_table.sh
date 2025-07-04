#!/bin/bash

echo "Fixing duplicate table issue for page_permissions..."

# Option 1: Fake the migration that's causing the issue
echo "Run this command to fake the migration (if the table already exists):"
echo "python manage.py migrate custom_auth 0012_add_rbac_models --fake"

echo ""
echo "Or if that doesn't work, try:"
echo ""

# Option 2: Drop the table and run migrations normally
echo "To drop the table and recreate it (WARNING: This will delete any existing data):"
echo "1. python manage.py dbshell"
echo "2. DROP TABLE IF EXISTS page_permissions CASCADE;"
echo "3. DROP TABLE IF EXISTS user_page_access CASCADE;"
echo "4. DROP TABLE IF EXISTS role_templates CASCADE;"
echo "5. DROP TABLE IF EXISTS role_template_pages CASCADE;"
echo "6. DROP TABLE IF EXISTS user_invitations CASCADE;"
echo "7. \\q"
echo "8. python manage.py migrate"

echo ""
echo "Option 3: Check which tables exist:"
echo "python manage.py dbshell"
echo "\\dt *permission*"
echo "\\dt *role*"
echo "\\dt *invitation*"
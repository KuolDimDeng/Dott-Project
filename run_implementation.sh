#!/bin/bash

# Script to run the page access control implementation
echo "Starting page access control implementation..."

# Run the backend script
echo "Running backend script..."
cd backend/pyfactor
python scripts/Version0001_enhance_page_privileges_with_employees.py
cd ../..

# Run the frontend script
echo "Running frontend script..."
cd frontend/pyfactor_next
node scripts/Version0001_enhance_user_page_privileges.js
cd ../..

# Fix the setup-password page
echo "Fixing setup-password page..."
node scripts/fix_setup_password.js

echo "Implementation complete!"
echo "Please restart both the backend and frontend servers:"
echo "  python run_server.py"
echo "  pnpm run dev"

echo "See PAGE_ACCESS_CONTROL_SUMMARY.md for more details."

#!/bin/bash

echo "🔍 Checking and Removing kuoldimdeng@outlook.com from Production"
echo "================================================================"
echo ""
echo "This script will remove the user kuoldimdeng@outlook.com if they exist."
echo ""
echo "To run this on production:"
echo ""
echo "1. SSH into your Render shell or production server"
echo ""
echo "2. Run the following command:"
echo "   python scripts/remove_specific_user.py"
echo ""
echo "Or if you have database access, run this SQL directly:"
echo ""
cat << 'EOF'
-- Check if user exists
SELECT id, email, username, date_joined, is_active 
FROM auth_user 
WHERE email = 'kuoldimdeng@outlook.com';

-- If user exists, delete them (this will cascade delete related records)
DELETE FROM auth_user 
WHERE email = 'kuoldimdeng@outlook.com';

-- Verify deletion
SELECT COUNT(*) as user_count 
FROM auth_user 
WHERE email = 'kuoldimdeng@outlook.com';
EOF

echo ""
echo "The script has been created at:"
echo "  backend/pyfactor/scripts/remove_specific_user.py"
echo ""
echo "This script will:"
echo "  1. Check if kuoldimdeng@outlook.com exists"
echo "  2. If found, automatically delete the user"
echo "  3. If not found, confirm the user doesn't exist"
echo ""
echo "✅ Script is ready to use on production"
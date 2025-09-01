#!/bin/bash

# Script to fix mobile navigation in all mobile HTML files
# This updates back buttons to use mobile-business-menu.html

echo "Fixing mobile navigation..."

# Update files in the out directory
cd /Users/kuoldeng/projectx/frontend/pyfactor_next/out

# Fix inventory back button
if [ -f mobile-inventory.html ]; then
  sed -i '' 's/mobile-menu\.html/mobile-business-menu.html/g' mobile-inventory.html
  echo "✓ Fixed mobile-inventory.html"
fi

# Fix banking back button  
if [ -f mobile-banking.html ]; then
  sed -i '' 's/mobile-settings\.html/mobile-business-menu.html/g' mobile-banking.html
  echo "✓ Fixed mobile-banking.html"
fi

# Fix payroll history back button
if [ -f mobile-payroll-history.html ]; then
  sed -i '' 's/mobile-main\.html/mobile-business-menu.html/g' mobile-payroll-history.html
  echo "✓ Fixed mobile-payroll-history.html"
fi

# Copy updated files to iOS public directory
echo "Copying to iOS public directory..."
cp mobile-inventory.html ../ios/App/App/public/ 2>/dev/null
cp mobile-banking.html ../ios/App/App/public/ 2>/dev/null
cp mobile-payroll-history.html ../ios/App/App/public/ 2>/dev/null
cp mobile-timesheet.html ../ios/App/App/public/ 2>/dev/null
cp mobile-paystubs.html ../ios/App/App/public/ 2>/dev/null

echo "✓ Navigation fixes complete!"
echo "Note: The iOS app needs to be rebuilt to include these changes."
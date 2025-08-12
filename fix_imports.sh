#!/bin/bash

# Fix all validateTenantAccess imports
files=(
  "frontend/pyfactor_next/src/app/api/services/route.js"
  "frontend/pyfactor_next/src/app/api/services/[id]/route.js"
  "frontend/pyfactor_next/src/app/api/services/bulk-delete/route.js"
  "frontend/pyfactor_next/src/app/api/bills/stats/route.js"
  "frontend/pyfactor_next/src/app/api/bills/[id]/mark-paid/route.js"
  "frontend/pyfactor_next/src/app/api/bills/[id]/route.js"
  "frontend/pyfactor_next/src/app/api/bills/bulk-delete/route.js"
  "frontend/pyfactor_next/src/app/api/bills/route.js"
  "frontend/pyfactor_next/src/app/api/estimates/stats/route.js"
  "frontend/pyfactor_next/src/app/api/estimates/[id]/send/route.js"
  "frontend/pyfactor_next/src/app/api/estimates/[id]/convert-to-invoice/route.js"
  "frontend/pyfactor_next/src/app/api/estimates/[id]/route.js"
  "frontend/pyfactor_next/src/app/api/estimates/bulk-delete/route.js"
  "frontend/pyfactor_next/src/app/api/vendors/[vendorId]/route.js"
  "frontend/pyfactor_next/src/app/api/vendors/route.js"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    # Replace the import statement
    sed -i '' "s/import { validateTenantAccess } from '@\/utils\/auth';/import { validateTenantAccess } from '@\/utils\/auth-server';/g" "$file"
    # Also handle if there are other imports from the same module
    sed -i '' "s/import { \([^}]*\), validateTenantAccess } from '@\/utils\/auth';/import { \1 } from '@\/utils\/auth';\nimport { validateTenantAccess } from '@\/utils\/auth-server';/g" "$file"
    sed -i '' "s/import { validateTenantAccess, \([^}]*\) } from '@\/utils\/auth';/import { \1 } from '@\/utils\/auth';\nimport { validateTenantAccess } from '@\/utils\/auth-server';/g" "$file"
  fi
done

echo "All imports fixed!"
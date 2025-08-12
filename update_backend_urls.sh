#!/bin/bash

# List of API route files that need updating
files=(
  "frontend/pyfactor_next/src/app/api/auth/session-v2/route.js"
  "frontend/pyfactor_next/src/app/api/auth/profile/route.js"
  "frontend/pyfactor_next/src/app/api/currency/preferences/route.js"
  "frontend/pyfactor_next/src/app/api/pricing/by-country/route.js"
  "frontend/pyfactor_next/src/app/api/products/route.js"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating $file..."
    
    # Check if the file already imports getBackendUrl
    if ! grep -q "import { getBackendUrl }" "$file"; then
      # Add the import at the beginning of the file (after 'use strict' if present)
      sed -i '' "1a\\
import { getBackendUrl } from '@/utils/backend-url';\\
" "$file"
    fi
    
    # Replace the BACKEND_URL constant definition
    sed -i '' "s|const BACKEND_URL = .*|const BACKEND_URL = getBackendUrl();|g" "$file"
    
    # Also handle NEXT_PUBLIC_API_URL patterns
    sed -i '' "s|process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'|getBackendUrl()|g" "$file"
  fi
done

echo "All API routes updated to use internal Render URL!"
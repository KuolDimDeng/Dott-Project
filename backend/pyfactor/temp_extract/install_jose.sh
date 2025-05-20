#!/bin/bash
# Script to install jose package for server-side JWT verification

cd /Users/kuoldeng/projectx/frontend/pyfactor_next
npm install jose

# Also install @tailwindcss/forms which was missing
npm install @tailwindcss/forms

echo "Successfully installed jose and @tailwindcss/forms"
#!/bin/bash

# Fix all timesheet route files that use makeBackendRequest
FILES=(
  "/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/timesheets/v2/time-off-requests/pending_approvals/route.js"
  "/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/timesheets/v2/time-off-requests/[id]/reject/route.js"
  "/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/timesheets/v2/time-off-requests/[id]/approve/route.js"
  "/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/timesheets/v2/employee-timesheets/[id]/submit_for_approval/route.js"
  "/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/timesheets/v2/employee-timesheets/[id]/update_entries/route.js"
  "/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/timesheets/v2/supervisor-approvals/reject_timesheet/route.js"
  "/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/timesheets/v2/supervisor-approvals/approve_timesheet/route.js"
  "/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/timesheets/v2/supervisor-approvals/pending_timesheets/route.js"
  "/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/timesheets/v2/clock-entries/clock_out/route.js"
  "/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/timesheets/v2/clock-entries/status/route.js"
  "/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/timesheets/v2/clock-entries/clock_in/route.js"
)

for file in "${FILES[@]}"; do
  echo "Fixing $file"
  
  # Replace the import
  sed -i '' "s/import { makeBackendRequest } from '@\/utils\/api';/import { makeRequest } from '@\/utils\/api';/g" "$file"
  
  # Replace function calls - this is trickier since we need to adjust the parameters
  # For GET requests
  sed -i '' "s/await makeBackendRequest(\(.*\), {$/await makeRequest(\1, {/g" "$file"
  
  # Fix the cookies parameter
  sed -i '' "s/cookies: request.cookies,/\/\/ cookies handled by makeRequest/g" "$file"
  
  # Add request parameter to makeRequest calls
  sed -i '' "s/await makeRequest(\(.*\)});/await makeRequest(\1}, request);/g" "$file"
  
  # Fix return statements
  sed -i '' "s/return response;/return Response.json(response);/g" "$file"
done

echo "Done fixing imports!"
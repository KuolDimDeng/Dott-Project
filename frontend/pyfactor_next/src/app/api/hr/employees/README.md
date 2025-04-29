# HR Employee API Fix

## Issue
The HR employee API was returning 403 Forbidden errors when accessing employee data.

## Solution
This fix improves the Next.js API route handler to properly forward requests to the backend API:

1. Added multiple tenant ID header formats to ensure backend compatibility
2. Improved error handling with specific messages for different 403 error scenarios
3. Added detailed logging to help diagnose authentication issues
4. Fixed query parameter handling to ensure tenant context is properly passed

## How It Works
The API route now forwards all necessary headers and parameters to the backend with proper error handling.

## Script Version
Applied on 2025-04-26

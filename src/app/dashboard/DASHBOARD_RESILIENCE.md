# Dashboard Resilience Architecture

## Overview
This document outlines the architecture changes made to improve dashboard resilience, especially handling tenant redirections and chunk loading errors that were causing the dashboard to fail after login.

## Key Changes (2025-04-19)

### 1. Removed Material UI Dependencies
- Replaced MUI components with Tailwind CSS in the DashboardContent component
- Eliminated external library dependencies that were causing chunk loading errors
- Simplified component structure for better reliability

### 2. Improved Error Handling
- Added global error handlers for chunk loading errors
- Implemented recovery mechanisms that reload the page when chunk errors occur
- Added service worker cleanup to prevent caching issues

### 3. Modified Page Loading Strategy
- Replaced dynamic imports with static imports to reduce chunk loading errors
- Added fallback loading states with clear user feedback
- Implemented script-based recovery for extreme failure cases

### 4. Tenant-specific Dashboard Structure
- Created dedicated tenant dashboard pages with proper layouts
- Added tenant ID context to the global window object
- Implemented tenant-aware error recovery logic

### 5. Component Structure Changes
- Simplified the component tree to reduce render complexity
- Fixed provider nesting issues that could cause hydration errors
- Made session management more resilient

## Error Recovery Flow
1. User authentication completes successfully
2. Tenant ID is retrieved from Cognito attributes
3. User is redirected to tenant-specific dashboard URL
4. If chunk loading errors occur:
   - Error is caught by global event listener
   - Service workers are unregistered to clear cached resources
   - Page is reloaded with cache-busting parameters
   - Dashboard content is loaded with proper tenant context

## Implementation Details

### Dashboard Content Component
- Switched from MUI to Tailwind CSS
- Implemented self-contained component with no external dependencies
- Added proper loading states and error handling

### Dashboard Page & Layout
- Simplified structure with static components
- Added global error handlers via Script components
- Improved session management with SessionProviderWrapper

### Tenant Dashboard Structure
- Created parallel tenant-specific dashboard structure
- Used same components as main dashboard for consistency
- Added tenant context to prevent isolation issues

## Security Considerations
- All tenant data stored in Cognito attributes, not cookies or localStorage
- No hardcoded tenant IDs or fallbacks
- Proper tenant isolation for multi-tenant security

## Potential Future Improvements
- Implement React error boundaries for component-specific error handling
- Add telemetry for tracking error rates and recovery success
- Implement progressive enhancement for better offline support
- Add retry mechanisms for API calls with exponential backoff 
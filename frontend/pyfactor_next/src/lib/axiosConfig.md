# Axios Configuration Documentation

This document outlines the networking and HTTP configuration options for the PyFactor Next.js application.

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2023-11-28 | Fixed backend connection checker in axiosConfig.js to handle errors properly | System |

## Overview

The application uses Axios for all HTTP requests. There are several Axios instances configured for different purposes:

- `axiosInstance` - The default instance for most API calls
- `serverAxiosInstance` - For server-side API calls
- `backendHrApiInstance` - Specifically configured for HR API calls, with circuit breaker functionality

## HTTPS Support

The application now supports HTTPS with self-signed certificates via the following components:

1. `https-config.js` - Provides utilities to configure Axios for HTTPS with self-signed certificates
2. Circuit breaker reset functionality in the main layout
3. Environment variables for API URLs that start with `https://` when in HTTPS mode

### Using HTTPS with Self-Signed Certificates

When running in HTTPS mode (using `pnpm run dev:https`), the application:

1. Uses `https://` protocol for all API calls
2. Configures Axios to accept self-signed certificates
3. Automatically resets circuit breakers that may have been triggered during protocol transition

### Troubleshooting HTTPS Issues

If you encounter "Circuit breaker open" errors after switching to HTTPS:

1. Manually reset circuit breakers by opening the browser console and typing:
   ```javascript
   window.resetCircuitBreakers()
   ```

2. Refresh the page to ensure all connections use the new HTTPS configuration

3. Check that both frontend and backend are running with HTTPS enabled

## Circuit Breaker Functionality

The application implements a circuit breaker pattern to prevent overwhelming failed services:

- After 5 consecutive failures to an endpoint, the circuit "opens" and rejects requests
- After 15 seconds, the circuit enters "half-open" state and allows one test request
- If the test request succeeds, the circuit "closes" and returns to normal operation

Circuit breakers are specific to individual API endpoints, so if one endpoint fails, other endpoints will still work.

### Manually Resetting Circuit Breakers

To manually reset circuit breakers for testing or after resolving issues:

```javascript
// In browser console
window.resetCircuitBreakers()
```

Or use the `resetCircuitBreakers()` function from the `axiosConfig.js` module in your code.

## API Base URLs

The application determines the API base URL from environment variables:

- `NEXT_PUBLIC_API_URL` - Base URL for external APIs
- `BACKEND_API_URL` - URL for backend services

When in HTTPS mode, these URLs are expected to use the `https://` protocol.

## Request Retry Mechanism

Axios requests are configured with automatic retry capabilities:

- Retry on timeout with a doubled timeout value
- Retry on network errors after a short delay
- Circuit breaker implementation to prevent overwhelming failed services

## Debugging Tools

The following tools are available for debugging API issues:

- `diagnoseConnection()` - Tests connectivity to the backend
- `verifyBackendConnection()` - Performs a more comprehensive connectivity test
- Browser console logging for request/response details

## Adding Custom Configuration

To add custom configuration for specific API endpoints:

1. Create a custom Axios instance
2. Configure it with appropriate interceptors
3. Export and use it in your components

For HTTPS support with custom instances, use the `createHttpsAxiosInstance()` function from `https-config.js`.

## Recent Changes

### 2023-11-28: Fixed Backend Connection Checker

The backend connection checker was experiencing issues where errors were being logged as empty objects, making it difficult to diagnose connection problems. This occurred in the `verifyBackendConnection` function.

Changes made:
- Enhanced error handling in the verifyBackendConnection function
- Added safe property access with optional chaining to prevent undefined references
- Improved error object serialization for logging
- Added fallback mechanisms using fetch API when axios requests fail
- Added additional diagnostic information for network errors
- Added timestamps to error objects for better debugging
- Fixed the empty error object issue in the connection checker

### Fix for Employee Management Data Fetching Issue

#### Problem
The application was encountering SSL Protocol errors when attempting to fetch employee data from the AWS RDS database. This occurred because the frontend was using HTTPS to connect to a backend server running on HTTP (127.0.0.1:8000) with SSL disabled.

#### Solution Implemented
1. Created a dedicated `backendHrApiInstance` Axios instance specifically configured for HR/employee API operations
2. Configured this instance to:
   - Connect directly to the backend HR API endpoints via HTTP
   - Use a longer timeout (90 seconds) for potentially lengthy HR operations
   - Disable SSL certificate verification for local development
   - Use proper base URL construction for backend API calls

3. Updated the `employeeApi` methods in `apiClient.js` to:
   - Use the new `backendHrApiInstance` for all employee operations
   - Properly handle tenant ID for Row-Level Security (RLS)
   - Add improved cache invalidation and cache busting
   - Include better error handling and logging

## Key Components

### Axios Instances
1. `axiosInstance` - Primary instance for frontend API routes, using `/api` as the base URL
2. `serverAxiosInstance` - Server-side instance with SSL verification disabled
3. `backendHrApiInstance` - Dedicated instance for HR operations targeting the backend directly

### Features
- Circuit breaker pattern for preventing cascading failures
- Dynamic tenant ID handling for multi-tenant isolation
- Token refresh and retry mechanisms for authentication errors
- Enhanced timeout configuration for different endpoint types
- Cache busting for preventing stale data issues
- Connection verification functionality for improved diagnostics

## Connection Verification
The new `verifyBackendConnection` function provides detailed diagnostics when connection issues occur:
- Tests direct HTTP connection to the backend server
- Provides specific troubleshooting guidance based on error types
- Detailed logging of connection test results
- Available through the `window.__diagnostics` object in development mode

## Usage Guidelines
- Use `axiosInstance` for standard frontend API calls
- Use `serverAxiosInstance` for server-side direct backend calls
- Use `backendHrApiInstance` specifically for employee/HR operations
- Always include proper error handling when making API calls
- Use the cache invalidation mechanisms when updating data to prevent stale data display
- For connection troubleshooting, use the verifyBackendConnection function

## Security Considerations
- SSL verification is disabled only for local development
- Sensitive information like authentication tokens are never hard-coded
- Tenant isolation is enforced through headers and query parameters
- Authentication tokens are managed through AWS AppCache or Cognito directly, not in cookies or local storage 
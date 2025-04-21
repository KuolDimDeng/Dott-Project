# API Client Documentation

## Overview
The API client provides a set of standardized methods for interacting with the application's backend services. It abstracts away the complexity of making API calls, handling authentication, error management, and cache invalidation.

## Recent Changes

### Fix for Employee Management Data Fetching Issue

#### Problem
The application was encountering SSL Protocol errors when trying to fetch employee data from the AWS RDS database. The issue was related to how the employee API methods were making requests to the backend server running on HTTP (127.0.0.1:8000) with SSL disabled.

#### Solution Implemented
1. Updated the `employeeApi` methods to use the dedicated `backendHrApiInstance` instead of the generic API client
2. Modified the endpoints to correctly point to the backend server:
   - Changed `/api/hr/employees` to `/employees` as the base URL is already set in the instance
   - Added proper headers and tenant ID handling for Row-Level Security (RLS)
   - Implemented cache busting with timestamp parameters
   - Improved error handling and logging

3. Enhanced cache invalidation to prevent stale data:
   - Added explicit invalidation for individual employee endpoints
   - Ensured cache is cleared after all create, update, and delete operations
   - Added timestamp parameter to bypass browser and CDN caches

## API Modules

### Base API Client
- `apiClient.get(endpoint, params)` - Generic GET request
- `apiClient.post(endpoint, data, params)` - Generic POST request
- `apiClient.put(endpoint, data, params)` - Generic PUT request
- `apiClient.patch(endpoint, data, params)` - Generic PATCH request
- `apiClient.delete(endpoint, params)` - Generic DELETE request

### Employee API
- `employeeApi.getAll(params)` - Get all employees for the current tenant
- `employeeApi.getById(id, params)` - Get a specific employee by ID
- `employeeApi.create(data, params)` - Create a new employee
- `employeeApi.update(id, data, params)` - Update an existing employee
- `employeeApi.delete(id, params)` - Delete an employee

All employee API methods now use direct HTTP communication with the backend server and include:
- Tenant isolation through headers and params
- Automatic cache invalidation
- Improved error handling
- Cache busting to prevent stale data

## Best Practices
1. Always use the appropriate API module for the entity you're working with (e.g., `employeeApi` for employee operations)
2. Include proper error handling in components that call these methods
3. For write operations (create, update, delete), check for response status before assuming success
4. When fetching data that might be affected by a recent write operation, include `{ bypassCache: true }` in the params
5. Do not hardcode tenant IDs; always use the utility functions to retrieve them

## Security Considerations
- Row-Level Security (RLS) is enforced through tenant ID headers and parameters
- Authentication tokens are handled automatically by the axios instances
- No sensitive information is stored in cookies or local storage
- API instances are configured for proper security in production environments 
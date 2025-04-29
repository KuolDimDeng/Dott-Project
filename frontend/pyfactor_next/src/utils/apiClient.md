# API Client Module Documentation

## Overview
This module provides client-side API utilities for interacting with the backend services. It includes several specialized API client objects for different resource types (products, employees, services, etc.).

## Recent Changes

### 2025-04-26: Fixed Duplicate Employee API Methods
- **Issue**: The `employeeApi` object had duplicate method definitions for `getAll`, `getCurrent`, and `getById`, which caused conflicts when the code attempted to fetch employee data.
- **Fix**: Consolidated the methods to use the simpler `fetchWithAuth` approach for employee-related API calls.
- **Impact**: This change resolves the 501 Not Implemented error when trying to fetch employees from `/api/hr/employees` endpoint.
- **Implementation**: Script `Version0001_fix_duplicate_employeeApi_methods_apiClient.js` handles this fix.

## API Clients

### Base API Client
The `apiClient` object provides generic methods for making HTTP requests:
- `get(endpoint, params)`
- `post(endpoint, data, params)`
- `put(endpoint, data, params)`
- `patch(endpoint, data, params)`
- `delete(endpoint, params)`

### Employee API Client
The `employeeApi` object provides methods specific to employee resources:
- `getAll()`: Fetches all employees using `fetchWithAuth`
- `getCurrent()`: Gets the current user's employee information 
- `getById(id)`: Fetches a specific employee by ID
- `create(data, params)`: Creates a new employee record
- `update(id, data, params)`: Updates an existing employee record
- `delete(id, params)`: Deletes an employee record

### Authentication
Employee API methods use the `fetchWithAuth` utility from `@/utils/api.js`, which:
1. Gets authentication headers from Cognito or AppCache
2. Automatically includes auth tokens in requests
3. Handles authentication errors (401) appropriately

## Usage Notes
- The `employeeApi` methods now use a consistent approach for authentication and error handling
- Employee data is fetched from the `/api/hr/employees/` endpoint
- Auth tokens are retrieved from AWS Cognito and cached in AppCache for subsequent requests

## API Modules

### Base API Client
- `apiClient.get(endpoint, params)` - Generic GET request
- `
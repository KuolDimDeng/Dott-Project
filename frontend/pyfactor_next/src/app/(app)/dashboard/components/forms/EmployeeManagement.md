# Employee Management Component Documentation

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2023-11-28 | Fixed useMockMode reference error by replacing localStorage with AppCache | System |
| 2023-10-20 | 1.0.1 | Fixed React key props spreading issue | AI Assistant |

## Overview
The Employee Management component handles CRUD operations for employee data, including fetching, creating, updating, and deleting employees. The component interacts with the AWS RDS database through API endpoints.

## Recent Issues and Fixes

### Issue 1: SSL Protocol Error When Connecting to Backend Database
When trying to fetch employee data from the AWS RDS database, the application encountered SSL Protocol errors. This occurred because the frontend was trying to use HTTPS to connect to a backend server running on HTTP (127.0.0.1:8000) with SSL disabled.

#### Root Cause
1. The application was using multiple axios instances with inconsistent configuration
2. The API client was not properly configured to use HTTP for the backend server
3. There was a protocol mismatch between the frontend (HTTPS) and backend (HTTP)
4. The SSL verification was enabled when connecting to a local development server

#### Fix Implemented
1. Created a specialized `backendHrApiInstance` in axiosConfig.js configured for direct HTTP communication with the backend
   - Configured with proper baseURL pointing to backend server (https://127.0.0.1:8000)
   - Disabled SSL verification for local development
   - Set appropriate timeouts for HR operations

2. Updated the employeeApi methods in apiClient.js to:
   - Use the dedicated backendHrApiInstance for all API operations
   - Properly handle tenant IDs for Row-Level Security (RLS)
   - Include better error handling and logging
   - Add cache busting techniques

3. Modified the EmployeeManagement component to:
   - Use the updated employeeApi methods for all CRUD operations
   - Properly handle API responses with improved error reporting
   - Implement more robust data fetching with fallbacks
   - Include better network error handling specific to backend connection issues

### Issue 2: New employees not displaying in the list after creation
When a new employee is created successfully, the employee appears in the database (as evidenced by the backend logs showing successful creation with ID assignment), but the employee list doesn't update to include the new employee.

#### Root Cause
1. The cache invalidation strategy was not properly clearing all cached employee data after creation
2. The forced refresh after employee creation was not bypassing the cache correctly
3. The API response processing wasn't handling the newly created employee data format correctly
4. The browser cache was retaining stale data due to insufficient cache control headers

#### Fix Implemented
1. Enhanced cache invalidation to ensure all employee-related cache entries are properly cleared after CRUD operations
   - Added invalidation in the API client for all employee methods
   - Implemented more aggressive cache clearing in the EmployeeManagement component
   - Added direct manipulation of window.__APP_CACHE to ensure complete cache clearing

2. Improved the forced refresh mechanism to completely bypass cache
   - Added proper cache control headers to API requests
   - Added cache-busting parameters to requests
   - Added explicit cache bypass flags to the API requests
   - Implemented a more complete cache invalidation before fetching fresh data

3. Enhanced the data normalization function to handle all possible employee data formats
   - Added better type checking for all employee fields
   - Implemented defaults for missing fields
   - Added normalization for employment types, roles, and date formats
   - Added specific logging for newly created employees to aid in debugging

4. Improved error handling and recovery mechanisms
   - Added multiple fallback mechanisms for failed data fetches
   - Added better error logging with context
   - Implemented graceful degradation when normalization fails

### Issue 3: JavaScript ReferenceError on component initialization
When navigating to the Employee Management page, the application throws a JavaScript error: "can't access lexical declaration 'normalizeEmployeeData' before initialization".

#### Root Cause
The `normalizeEmployeeData` function was being used in the `fetchEmployeesData` function before it was declared in the code. In JavaScript, function declarations are hoisted, but lexical declarations with `const` are not hoisted and cannot be accessed before their declaration point.

#### Fix Implemented
1. Moved the `normalizeEmployeeData` function declaration to before it is first used in the code
2. Placed the function before the `fetchEmployeesData` function that calls it
3. This ensures the lexical scoping rules of JavaScript are properly followed and the function is available when needed

## Key Changes Made
1. Updated the axiosConfig.js to add a backendHrApiInstance for direct communication with the backend
2. Enhanced the employeeApi methods to use the new instance and handle errors better
3. Improved the fetchEmployeesData function to handle HTTP connections properly
4. Updated CRUD operations (create, update, delete) to use the improved API methods
5. Added more specific error handling for connectivity issues
6. Implemented better logging throughout for debugging and monitoring
7. Added fallback mechanisms for failed data fetches

## API Interface
- `GET /api/hr/employees` - Fetch all employees
- `GET /api/hr/employees/:id` - Fetch a single employee by ID
- `POST /api/hr/employees` - Create a new employee
- `PUT /api/hr/employees/:id` - Update an existing employee
- `DELETE /api/hr/employees/:id` - Delete an employee

## Component Structure
- State management for employees list, loading state, errors
- Create, update, and delete functions with proper error handling
- Form for adding/editing employee details
- Table display for employee list with pagination, sorting
- Search functionality for filtering employees

## Backend Connection Details
- Backend server runs on HTTP at 127.0.0.1:8000
- SSL verification is disabled for local development
- Uses tenant ID for Row-Level Security (RLS)
- Direct API communication for HR operations rather than proxying through Next.js API routes

## Recent Changes

### 2023-11-28: Fixed useMockMode reference error

The component was previously using localStorage to store a flag indicating whether mock data should be used. This implementation
had a bug where the `useMockMode` variable was being accessed but not properly defined, causing runtime errors.

Changes made:
- Replaced localStorage.getItem('use_mock_data') with a properly defined AppCache approach
- Updated the toggleMockMode function to use AppCache instead of localStorage
- Modified UI references to check AppCache instead of localStorage

## Mock Mode Feature

The mock mode feature allows testing the component without requiring backend connectivity. When enabled:
- The component will fetch data from a local mock API endpoint instead of the real backend
- This is useful for development and testing scenarios when the backend is not available

## Usage

The component is rendered in the dashboard area and provides an interface for HR management. It requires proper authentication
and tenant context to function correctly.

## React Key Props Fix

### Issue Description

React requires that the `key` prop be passed directly to JSX elements rather than being spread as part of a props object. 
This issue occurred in the table rendering for the EmployeeManagement component.

```jsx
// Original problematic code:
<th
  {...column.getHeaderProps(column.getSortByToggleProps())}
  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
>
```

React was raising the following warning:

```
A props object containing a "key" prop is being spread into JSX:
  let props = {key: someKey, colSpan: ..., role: ..., onClick: ..., title: ..., style: ..., className: ..., children: ...};
  <th {...props} />
React keys must be passed directly to JSX without using spread:
  let props = {colSpan: ..., role: ..., onClick: ..., title: ..., style: ..., className: ..., children: ...};
  <th key={someKey} {...props} />
```

### Solution

The solution was to extract the `key` property from the props object and pass it directly as a prop:

```jsx
// Fixed code for table headers:
const headerProps = column.getHeaderProps(column.getSortByToggleProps());
const { key, ...restHeaderProps } = headerProps;

<th
  key={key}
  {...restHeaderProps}
  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
>

// Fixed code for table rows:
const rowProps = row.getRowProps();
const { key, ...restRowProps } = rowProps;

<tr 
  key={key || row.id || i}
  {...restRowProps}
  className="hover:bg-gray-50 cursor-pointer"
>
```

### Implementation Details

The fix was implemented using a script that:
1. Created a backup of the original file
2. Extracted the `key` property from both header and row props objects
3. Passed the `key` directly as a prop to the JSX elements
4. Spread the rest of the props separately

This approach follows React's requirements for key props while preserving all the functionality of the original implementation.

## Component Overview

The `EmployeeManagement` component provides a comprehensive interface for managing employee data, including:

- Listing employees in a sortable table
- Adding new employees
- Editing existing employee details
- Viewing detailed employee information
- Managing employee status

The component uses React Table for rendering the employee list with sorting and pagination capabilities. 
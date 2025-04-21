# Authentication Handling in Dashboard Components

## Session Management

Dashboard components use AWS Amplify for authentication and session management. This document outlines how session expiration is handled in various components.

## Common Issues

### Session Expiration

When a user's session expires, the following behaviors should occur:

1. API calls return 401 Unauthorized errors
2. Components catch these errors and display a user-friendly message
3. Users are provided with options to either refresh their session or log in again

### Required Helper Functions

All components that handle authentication errors should implement these helper functions:

- `redirectToLogin()` - Redirects to the login page with appropriate parameters
- `refreshSession()` - Attempts to refresh the user's authentication token

## Recent Changes

| Date | Component | Change | Issue |
|------|-----------|--------|-------|
| 2025-04-20 | EmployeeManagement | Added missing redirectToLogin function | Session expiration caused unhandled error when navigating to Employee Management |

## Implementation Example

```javascript
// Function to handle login redirection on session expiration
const redirectToLogin = () => {
  const currentPath = window.location.pathname + window.location.search;
  window.location.href = `/login?expired=true&redirect=${encodeURIComponent(currentPath)}`;
};

// Function to manually refresh the user session
const refreshSession = async () => {
  try {
    setLoading(true);
    const refreshed = await refreshUserSession();
    if (refreshed) {
      setError(null);
      toast.success('Session refreshed successfully');
      fetchData(); // Retry fetching data
    } else {
      setError('Failed to refresh session. Please log in again.');
    }
  } catch (error) {
    logger.error('[ComponentName] Error refreshing session:', error);
    setError('Failed to refresh session. Please log in again.');
  } finally {
    setLoading(false);
  }
};
```

## Best Practices

1. Always define `redirectToLogin` and `refreshSession` functions in components that handle authentication
2. Use the `refreshUserSession` utility from `/utils/refreshUserSession` for token refresh
3. Display user-friendly error messages with action buttons
4. Include the current path in the login redirect to enable returning to the same page after authentication 
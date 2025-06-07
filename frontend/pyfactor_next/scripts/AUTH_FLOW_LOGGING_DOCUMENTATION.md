# Auth0 Authentication Flow Logging Documentation

## Overview

This documentation explains the comprehensive logging implementation for the Auth0 authentication flow. These logs help diagnose 500 errors and other authentication issues.

## Log Prefixes

All logs use consistent prefixes for easy filtering:

- `[AUTH0-LOGIN]`: Logs from the login route
- `[AUTH0-HANDLER]`: Logs from the Auth0 API handler
- `[AUTH0-CONFIG]`: Logs from the Auth0 configuration
- `[MIDDLEWARE]`: Logs from the Next.js middleware
- `[AUTH0-CALLBACK]`: Logs from the callback route

## Environment Variables

The logging implementation checks and logs the following environment variables:

- `AUTH0_DOMAIN`: The Auth0 domain (e.g., `auth.dottapps.com`)
- `AUTH0_CLIENT_ID`: The Auth0 client ID
- `AUTH0_CLIENT_SECRET`: The Auth0 client secret (logged as "Set" or "Not set" for security)
- `AUTH0_SECRET`: The Auth0 secret (logged as "Set" or "Not set" for security)
- `AUTH0_BASE_URL`: The base URL for the application
- `AUTH0_ISSUER_BASE_URL`: The issuer base URL for Auth0
- `AUTH_DEBUG`: Set to `true` to enable comprehensive debug logging (defaults to `true` in this implementation)

## File Modifications

The following files have been enhanced with comprehensive logging:

- `src/app/api/auth/login/route.js`: Auth0 login route
- `src/app/api/auth/[...auth0]/route.js`: Auth0 API handler
- `src/config/auth0.js`: Auth0 configuration
- `src/middleware.js`: Next.js middleware

## Domain Validation

The implementation adds validation for the Auth0 domain to ensure it is:

1. Defined and a string
2. Contains periods (.)
3. Does not start with "http" or "https"

## Error Handling

Enhanced error handling has been added to:

1. Catch and log errors during Auth0 redirect
2. Provide detailed error messages in API responses
3. Log configuration errors with clear error messages

## Usage

To view the logs:

1. Set `AUTH_DEBUG=true` in your environment
2. Watch the console for logs with the prefixes mentioned above
3. Use the logs to diagnose authentication issues

## Troubleshooting

If you encounter a 500 error on the Auth0 login route:

1. Check the logs for the `[AUTH0-LOGIN]` prefix
2. Verify the Auth0 domain is correctly configured
3. Ensure all required environment variables are set
4. Check for any errors during the redirect process

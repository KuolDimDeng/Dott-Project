# Network Connectivity Troubleshooting

## Issue Overview

The application is experiencing network connectivity issues between the frontend and backend, manifesting as repeated "NetworkError when attempting to fetch resource" errors in the browser console. This typically occurs when:

1. The frontend is running over HTTPS (https://localhost:3000)
2. The backend is running over HTTPS (https://127.0.0.1:8000)
3. SSL certificate verification is failing
4. CORS headers are missing or incorrectly configured
5. Circuit breakers in the application are preventing requests after multiple failures

## Diagnostic Script

The `20240425_network_connectivity_diagnosis.js` script helps diagnose and fix these network connectivity issues.

### Features

- Verifies SSL certificate configuration and validity
- Tests connectivity to both frontend and backend servers
- Analyzes browser console output for common error patterns
- Checks CORS configuration on the backend
- Verifies Amplify configuration
- Automatically applies common fixes for network issues

### Usage

1. Run the script from the project root directory:

```bash
cd /Users/kuoldeng/projectx
node scripts/20240425_network_connectivity_diagnosis.js
```

2. To analyze a specific browser console log file:

```bash
node scripts/20240425_network_connectivity_diagnosis.js path/to/console-log.txt
```

### Common Issues and Solutions

#### SSL Certificate Issues

Self-signed certificates need to be properly installed and configured. The script verifies:
- Certificate existence
- Certificate validity dates
- Proper configuration in axios instances

#### CORS Configuration

CORS must be properly configured on the backend to allow requests from the frontend:
- The backend should include proper CORS headers in responses
- Headers should include `Access-Control-Allow-Origin` with the frontend URL

#### Circuit Breaker Resets

The application implements a circuit breaker pattern to prevent repeated failing requests:
- Multiple failed requests can trigger the circuit breaker
- This can lead to all subsequent requests being blocked
- The script provides a way to reset circuit breakers

## Recommended Configurations

### Backend Configuration

For the backend running at https://127.0.0.1:8000:

1. Ensure SSL certificates are properly configured
2. CORS should allow requests from https://localhost:3000
3. Use HTTPS/SSL with the same certificates as the frontend

In Django settings.py:
```python
CORS_ALLOWED_ORIGINS = [
    "https://localhost:3000",
    "https://127.0.0.1:3000",
]
```

### Frontend Configuration

For the frontend running at https://localhost:3000:

1. Use HTTPS with proper certificates
2. Configure axios to handle self-signed certificates in development
3. Use appropriate tenant ID and authentication token headers

Start the server with:
```bash
pnpm run dev:https
```

### HTTPS Configuration

The application runs on HTTPS with self-signed certificates for development:

1. Certificates are stored in the `certificates` directory
2. Default certificate names: `localhost+1.pem` and `localhost+1-key.pem`
3. Generated using `mkcert`

## Troubleshooting Workflow

When experiencing network errors:

1. Run the diagnostic script to identify issues
2. Check browser console for specific error messages
3. Verify HTTPS configuration on both frontend and backend
4. Reset circuit breakers if needed
5. Restart both frontend and backend servers

## Registry Information

- **Script ID**: network-connectivity-20240425
- **Version**: 1.0.0
- **Created**: April 25, 2024
- **Author**: System Administrator
- **Status**: Active

## Related Scripts

- `verify-connection.js` - Verifies backend connection
- `diagnose-backend.js` - Diagnoses backend connectivity issues 
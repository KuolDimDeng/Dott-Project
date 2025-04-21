# HTTPS Setup Guide

This guide explains how to enable and use HTTPS with SSL in the PyFactor application for both development and production environments.

## Overview

The application supports HTTPS using self-signed certificates generated with `mkcert`. This setup provides:

1. Secure encrypted communications between client and server
2. Local development environment that mimics production HTTPS requirements
3. Proper testing of authentication flows that require secure contexts

## Prerequisites

- The `mkcert` tool must be installed on your development machine
- SSL certificates must be generated and properly installed
- Both frontend and backend servers must be configured for HTTPS

## Certificate Setup

Certificates are generated using `mkcert` and stored in the `certificates` directory at the project root.

### Installing mkcert

```bash
# macOS
brew install mkcert
mkcert -install

# Linux
sudo apt install mkcert
mkcert -install

# Windows
choco install mkcert
mkcert -install
```

### Generating Certificates

The application expects certificates for `localhost` and `127.0.0.1`:

```bash
mkdir -p certificates
cd certificates
mkcert localhost 127.0.0.1
```

This will create two files:
- `localhost+1.pem` - The certificate file
- `localhost+1-key.pem` - The private key file

## Starting the Application with HTTPS

### Frontend (Next.js)

To start the frontend with HTTPS:

```bash
cd frontend/pyfactor_next
pnpm run dev:https
```

This command sets the necessary environment variables and starts Next.js with SSL support.

### Backend (Django/FastAPI)

To start the backend with HTTPS:

```bash
cd backend/pyfactor
./start-https.sh
```

Or run the Python script directly:

```bash
cd backend/pyfactor
python run_https_server_fixed.py
```

## Troubleshooting HTTPS Issues

### Circuit Breaker Errors

If you see errors like "Circuit breaker open for /employees" after switching to HTTPS:

1. Add `?debug=true` to your URL to show the debug panel
2. Click the "Reset Circuit Breakers" button in the bottom right
3. Refresh the page

Or execute this in the browser console:
```javascript
window.resetCircuitBreakers()
```

### Certificate Trust Issues

If you see browser warnings about untrusted certificates:

1. Ensure you ran `mkcert -install` to register the CA
2. For Firefox, install `certutil` with `brew install nss` and re-run `mkcert -install`
3. Try restarting your browser

### API Connection Issues

If the frontend can't connect to the backend:

1. Verify both servers are running with HTTPS
2. Check that API URLs use `https://` protocol
3. Ensure no mixed content warnings in browser console

## Production Considerations

For production deployment:

1. Replace self-signed certificates with proper CA-signed certificates
2. Use a reverse proxy like Nginx or AWS ALB with proper SSL termination
3. Ensure all interconnected services use HTTPS

## Technical Implementation Details

The HTTPS implementation includes:

1. Frontend configuration in `frontend/pyfactor_next/src/lib/https-config.js`
2. Backend implementation in `backend/pyfactor/run_https_server_fixed.py`
3. Circuit breaker reset functionality for handling protocol transitions
4. Environment variable configuration for API URLs

## Related Documentation

- [Next.js HTTPS documentation](https://nextjs.org/docs/api-reference/cli#development)
- [Uvicorn HTTPS documentation](https://www.uvicorn.org/#https)
- [mkcert GitHub repository](https://github.com/FiloSottile/mkcert) 
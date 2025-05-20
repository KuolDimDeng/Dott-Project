# Database SSL Configuration

## Overview

This document provides information about the SSL configuration for database connections in the ProjectX application. SSL (Secure Sockets Layer) is used to encrypt the connection between the application and the PostgreSQL database server, ensuring that data transmitted is secure and protected from eavesdropping.

## Configuration Details

The application uses SSL for all database connections, with the following configuration:

1. **SSL Mode**: `require` - This ensures that the connection will only succeed if SSL is available
2. **Certificate Files**: 
   - `server-ca.pem` - Certificate Authority (CA) certificate  
   - `client-cert.pem` - Client certificate
   - `client-key.pem` - Client private key

## SSL Certificate Location

The SSL certificates are located at:
- `/Users/kuoldeng/projectx/certificates/`

Both the backend (Django) and frontend (Next.js) applications are configured to use certificates from this shared location.

## Implementation Scripts

The SSL configuration was implemented using the following scripts:

1. **Backend Script**: `backend/pyfactor/scripts/Version0001_EnableSSL_DatabaseSettings.py`
   - Updates the Django settings.py database configuration
   - Enables SSL mode for PostgreSQL connections
   - Uses the certificate files from the shared certificates directory

2. **Frontend Script**: `frontend/pyfactor_next/scripts/Version0001_EnableSSL_TenantAPI.mjs`
   - Updates the Next.js tenant API database configuration
   - Enables SSL for PostgreSQL connections in the tenant API
   - Uses the certificate files from the shared certificates directory

## How to Obtain SSL Certificates

For AWS RDS PostgreSQL:

1. Download the root CA certificate bundle from AWS:
   - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html

2. Create client certificates:
   - Option 1: Use AWS provided certificates (recommended)
   - Option 2: Generate self-signed certificates (for development only)

### Generating Self-Signed Certificates (Development Only)

```bash
# Navigate to the certificates directory
cd /Users/kuoldeng/projectx/certificates

# Generate CA key and certificate
openssl genrsa -out server-ca-key.pem 2048
openssl req -new -x509 -nodes -days 365 -key server-ca-key.pem -out server-ca.pem

# Generate client key and certificate
openssl genrsa -out client-key.pem 2048
openssl req -new -key client-key.pem -out client-cert.csr
openssl x509 -req -in client-cert.csr -CA server-ca.pem -CAkey server-ca-key.pem -CAcreateserial -out client-cert.pem -days 365
```

## Troubleshooting

If you encounter database connection errors related to SSL:

1. **"The server does not support SSL connections"**:
   - Ensure the required SSL certificate files exist in the correct location
   - Verify that your database server has SSL enabled
   - Check that the SSL certificate files have the correct permissions

2. **SSL certificate verification errors**:
   - Ensure the CA certificate matches the database server's certificate
   - Verify the client certificate and key are properly formatted
   - Check for expired certificates (valid date range)

3. **"SSL SYSCALL error: EOF detected"**:
   - This often indicates network issues or firewall rules blocking SSL connections
   - Verify network connectivity and firewall settings

## Important Notes

- For production environments, always use proper SSL certificates from trusted certificate authorities
- Do not use self-signed certificates in production
- Regularly update and rotate certificates as they expire
- Ensure certificate files have appropriate file permissions to protect private keys

## References

- [PostgreSQL SSL Documentation](https://www.postgresql.org/docs/current/ssl-tcp.html)
- [AWS RDS SSL Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)
- [Django Database SSL Options](https://docs.djangoproject.com/en/5.0/ref/databases/#postgresql-notes)
- [Node.js PostgreSQL SSL Configuration](https://node-postgres.com/features/ssl) 
# PostgreSQL Connection Guide

## Overview

This document covers how to handle PostgreSQL database connections in ProjectX, focusing on SSL configuration and common issues.

## SSL Connection Issues

When connecting to PostgreSQL databases, you may encounter SSL-related errors such as:

```
Error: The server does not support SSL connections
```

This usually happens when the application is configured to use SSL for database connections, but either:

1. The PostgreSQL server is not configured to support SSL
2. The SSL certificates are not properly set up
3. You're connecting to a local development database that doesn't have SSL enabled

## Solutions

### For Local Development

Our codebase now automatically detects localhost connections and makes SSL optional for them. This behavior can be controlled with the `DB_USE_SSL` environment variable:

- `DB_USE_SSL=true` - Forces SSL even for localhost connections
- `DB_USE_SSL=false` - Disables SSL for all connections (not recommended for production)
- Not set - Uses smart detection (SSL disabled for localhost, enabled for remote connections)

### For Production

In production environments, always use SSL when connecting to PostgreSQL. You should ensure:

1. PostgreSQL server has SSL properly configured
2. Application has the correct certificate authorities (CAs) installed
3. SSL certificates are valid and not expired

## Configuration Options

The database connection is configured in `src/app/api/tenant/db-config.js` with these main options:

### SSL Configuration

```javascript
// SSL configuration for AWS RDS
if (useSSL) {
  config.ssl = {
    rejectUnauthorized: false // Allow self-signed certs for AWS RDS
  };
}
```

### Database Connection Settings

You can configure database connection parameters using environment variables:

```
RDS_USERNAME or DB_USER - Database username
RDS_PASSWORD or DB_PASSWORD - Database password
RDS_HOSTNAME or DB_HOST - Database hostname
RDS_PORT or DB_PORT - Database port (default: 5432)
RDS_DB_NAME or DB_NAME - Database name
DB_USE_SSL - Control SSL usage (true/false)
```

## Troubleshooting

If you still encounter SSL-related issues:

1. Verify your PostgreSQL server configuration:
   ```
   SHOW ssl;
   ```

2. Check if SSL is enabled in PostgreSQL config (postgresql.conf):
   ```
   ssl = on
   ```

3. Ensure certificate files are properly configured:
   ```
   ssl_cert_file = 'server.crt'
   ssl_key_file = 'server.key'
   ```

4. For local development, you can explicitly disable SSL in your .env.local:
   ```
   DB_USE_SSL=false
   ```

5. Try connecting with psql to verify SSL is working:
   ```
   psql "sslmode=require host=localhost dbname=dott_main user=postgres"
   ```

## References

- [PostgreSQL SSL Documentation](https://www.postgresql.org/docs/current/ssl-tcp.html)
- [Node.js pg Module SSL Configuration](https://node-postgres.com/features/ssl)
- [AWS RDS SSL Configuration](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html) 
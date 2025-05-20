# Secure Database Configuration Guidelines

This document provides guidance on securely configuring database connections for PyFactor in production environments.

## Environment Variables

Always use environment variables for sensitive configuration like database credentials. **Never hardcode credentials in your application code**.

### Required Environment Variables

```
# Database Configuration
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_secure_password
DB_PORT=5432
```

## Managing Credentials

### Production Environment

1. **AWS Secrets Manager**: For production, store database credentials in AWS Secrets Manager
   ```javascript
   // Example of fetching credentials from AWS Secrets Manager
   const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
   
   async function getDatabaseCredentials() {
     const client = new SecretsManagerClient({ region: 'us-east-1' });
     const response = await client.send(
       new GetSecretValueCommand({
         SecretId: 'pyfactor/db/credentials',
         VersionStage: 'AWSCURRENT',
       })
     );
     return JSON.parse(response.SecretString);
   }
   ```

2. **Environment Variables**: Use environment variables managed by your deployment platform (AWS ECS, EKS, etc.)

3. **Parameter Store**: Use AWS Systems Manager Parameter Store for configuration

### Development Environment

For development, use `.env` files but ensure they are:
- Never committed to version control (add to `.gitignore`)
- Have restrictive file permissions (`chmod 600 .env`)
- Are unique per developer

## Security Best Practices

1. **Least Privilege**: Database users should have only the permissions they need
   ```sql
   -- Example of creating a restricted user
   CREATE USER app_user WITH PASSWORD 'secure_password';
   GRANT CONNECT ON DATABASE app_db TO app_user;
   GRANT USAGE ON SCHEMA public TO app_user;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
   ```

2. **Connection Encryption**: Always use SSL/TLS for database connections
   ```javascript
   // Example configuration
   {
     ssl: {
       rejectUnauthorized: true,
       ca: fs.readFileSync('/path/to/server-ca.pem').toString(),
     }
   }
   ```

3. **IP Restrictions**: Restrict database access to specific IP addresses
   - Use Security Groups in AWS
   - Modify pg_hba.conf for more granular control

4. **Connection Pooling**: Use connection pooling to manage resources efficiently
   ```javascript
   const pool = new Pool({
     max: 20,              // Maximum pool size
     idleTimeoutMillis: 30000,  // Close idle clients after 30 seconds
     connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection not established
   });
   ```

5. **Error Handling**: Sanitize error messages to prevent credential leakage
   ```javascript
   try {
     // Database operation
   } catch (error) {
     // Sanitize error before logging
     const sanitizedError = {
       code: error.code,
       message: error.message,
       // Don't include credentials or connection strings
     };
     console.error('Database error:', sanitizedError);
   }
   ```

## Monitoring

1. Set up monitoring for:
   - Failed login attempts
   - Unusual query patterns
   - Excessive connections
   - Long-running queries

2. Configure alerts for security events

3. Regularly review database logs

## Auditing

1. Enable database audit logging
   ```sql
   -- Example for PostgreSQL
   ALTER SYSTEM SET log_statement = 'mod';
   ALTER SYSTEM SET log_min_duration_statement = 1000;
   SELECT pg_reload_conf();
   ```

2. Implement schema and data changes through migrations with code review

3. Track all schema/permission changes

## Regular Maintenance

1. Keep database software updated with security patches

2. Periodically rotate credentials

3. Regularly review user permissions and remove unnecessary access

## Backup Strategy

1. Implement automated backups with encryption

2. Test recovery procedures regularly

3. Store backups in a secure, separate location

---

By following these guidelines, you'll maintain a secure database configuration for your PyFactor application in production environments.
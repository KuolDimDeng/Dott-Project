# Production Database Configuration

This document explains the database configuration for the PyFactor application in production.

## Configuration Overview

In production, the application exclusively uses the AWS RDS database for both the Django backend and Next.js API routes. This ensures data consistency and simplifies the deployment architecture.

## Database Details

### AWS RDS Database
- **Host**: `dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com`
- **Database**: `dott_main`
- **User**: `postgres` (Should be updated to a more secure username in production)
- **Port**: 5432

## Implementation Details

The system has been configured to use a single database connection profile for both Django and Next.js API routes:

1. **Django Backend**: Connects to AWS RDS using the database configuration in Django settings
2. **Next.js API Routes**: Connect to the same AWS RDS database to ensure data consistency

## Environment Variables

To ensure proper configuration, use these environment variables:

```
# Django database settings
DB_HOST=dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com
DB_NAME=dott_main
DB_USER=postgres
DB_PASSWORD=<secure-password>
DB_PORT=5432

# For Next.js postgres.js connection string format
DATABASE_URL=postgres://postgres:<secure-password>@dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com:5432/dott_main
```

## Tenant Table Structure

The `custom_auth_tenant` table is crucial for the multi-tenant functionality of the application. It has the following structure:

```sql
CREATE TABLE IF NOT EXISTS public.custom_auth_tenant (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id VARCHAR(255),
  schema_name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rls_enabled BOOLEAN DEFAULT TRUE,
  rls_setup_date TIMESTAMP WITH TIME ZONE NULL,
  is_active BOOLEAN DEFAULT TRUE
);
```

## Database Security

For enhanced production security:

1. Use a dedicated database user with minimal required permissions
2. Enable encryption of data in transit and at rest
3. Configure appropriate network security groups for the RDS instance
4. Implement regular database backups
5. Consider using AWS Secrets Manager for database credentials

## Connection Pooling

The application uses connection pooling to efficiently manage database connections:

```javascript
// Connection pool configuration
const connectionConfig = {
  connectionTimeoutMillis: 8000,
  statement_timeout: 15000,
  max: 20, // Increase for production if needed
  idleTimeoutMillis: 3000
};
```

Adjust these values based on your expected load and performance requirements.

## Monitoring and Troubleshooting

For monitoring database connections and troubleshooting issues, use the following API endpoint:

```
GET /api/tenant/test-database
```

This endpoint will test the connection to the AWS RDS database and return the status.

If you encounter issues with tenant records, check the following API endpoint:

```
GET /api/tenant/sync-databases
```

This endpoint will verify the tenant table exists and create it if needed.
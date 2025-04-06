# Database Preferences

## AWS RDS Configuration

This project is configured to **always** use AWS RDS as the database backend. Any mentions of "database" in conversations or instructions should be interpreted as referring to the AWS RDS instance, not local storage or development databases.

## Connection Details

The AWS RDS instance is located at:
- Host: `dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com`
- Database: `dott_main`
- Port: `5432`
- Schema naming convention: `tenant_<uuid>`

## Important Notes

1. All database operations should target the AWS RDS instance unless explicitly specified otherwise
2. Local database development is disabled by default
3. The system enforces the use of AWS RDS through the environment configuration

## Common Database Tasks

When performing any of these operations, they should target AWS RDS:
- Tenant creation or deletion
- Schema management
- Data migration
- Database queries and updates
- Table creation or modification 
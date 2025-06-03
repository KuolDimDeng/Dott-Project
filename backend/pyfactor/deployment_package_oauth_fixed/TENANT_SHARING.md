# Tenant Table Structure

This document explains the `custom_auth_tenant` table structure used in the application.

**Important Note:** While the table structure is the same, Django and Next.js are currently configured to use **different database instances**:

1. Next.js API routes: Use the local PostgreSQL at `localhost` 
2. Django backend: Uses the AWS RDS instance at `dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com`

## Architecture

The application uses a shared PostgreSQL table to store tenant information:

```
custom_auth_tenant
```

This table is accessed by both:
1. Django backend (Python)
2. Next.js API routes (Node.js)

## Database Structure

The table has the following structure:

```sql
CREATE TABLE public.custom_auth_tenant (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id VARCHAR(255),
  schema_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rls_enabled BOOLEAN DEFAULT TRUE,
  rls_setup_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);
```

## Django Model Configuration

The Django model is configured to use the same table without attempting to manage the table schema:

```python
class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    owner_id = models.CharField(max_length=255, null=True, blank=True)
    schema_name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)
    rls_enabled = models.BooleanField(default=True)
    rls_setup_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'custom_auth_tenant'
        managed = False  # Tell Django not to manage this table, it's shared with Next.js
```

The `managed = False` setting tells Django not to create, alter, or delete the table.

## Next.js API Configuration

The Next.js API routes connect to the same database and table:

```javascript
// Database configuration
const DB_CONFIG = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'dott_main'
};

// Creating tenant record
const insertQuery = `
  INSERT INTO custom_auth_tenant (
    id, name, owner_id, schema_name, created_at, updated_at,
    rls_enabled, rls_setup_date
  )
  VALUES ($1, $2, $3, $4, NOW(), NOW(), true, NOW())
  ON CONFLICT (id) DO UPDATE 
  SET name = EXCLUDED.name, 
      updated_at = NOW()
  RETURNING id, name, schema_name, owner_id, rls_enabled;
`;
```

## How Tenant Records Are Created

Tenant records can be created from multiple places:

1. **Django Admin**: Through the Django admin interface (AWS RDS database)
2. **Next.js API Routes**: Through `/api/tenant/create-tenant-record` and similar endpoints (local database)
3. **Onboarding Flow**: During user signup and onboarding

**IMPORTANT**: Due to the database separation, tenant records created in one database will not be available in the other database. This is a dev environment configuration issue that should be fixed for production.

## Diagnostic Tools

Use these diagnostic commands to verify tenant records:

```bash
# Check tenant records in the database
python3 -c "import psycopg2; conn = psycopg2.connect(dbname='dott_main', user='postgres', password='postgres', host='localhost', port='5432'); cursor = conn.cursor(); cursor.execute('SELECT COUNT(*) FROM custom_auth_tenant'); print(cursor.fetchone()[0]); conn.close()"

# Check Django model records
python manage.py shell -c "from custom_auth.models import Tenant; print(Tenant.objects.all())"

# Sync utility
python direct_tenant_sync.py
```

## Maintaining Consistency

To ensure consistency between Django and Next.js:

1. **Schema Changes**: If you need to alter the table schema, handle migrations carefully 
2. **Environment Variables**: Use consistent database connection parameters
3. **Model Configuration**: Keep the Django model in sync with the Next.js table structure

## Fixing the Database Configuration

To resolve the database inconsistency:

1. **Development Environment**:
   - Update the `.env` file for Django to point to the local PostgreSQL
   - Alternatively, update the Next.js configuration to use the AWS RDS instance

2. **Production Environment**:
   - Both Django and Next.js should connect to the same production database instance
   - Use the same credentials and connection parameters for both applications

3. **Synchronization Strategy**:
   - If data needs to be copied between the databases, use a data migration script
   - Consider implementing a replication strategy if both databases must be maintained